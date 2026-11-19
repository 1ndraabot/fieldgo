import { Prisma } from '@prisma/client';
import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import {
  HARI, JAM_MAKS, JAM_MIN, validasiJamOperasional, validasiLapangan, validasiTarif,
  type AturanTarif, type BarisJam, type InputLapangan,
} from './rules.ts';

export type Hasil<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; kode: 'MODE_DEMO' | 'TIDAK_DITEMUKAN' | 'VALIDASI' | 'KONFLIK'; pesan: string };

const gagal = <T>(kode: 'MODE_DEMO' | 'TIDAK_DITEMUKAN' | 'VALIDASI' | 'KONFLIK', pesan: string): Hasil<T> =>
  ({ ok: false, kode, pesan });

const modeDemo = <T>(): Hasil<T> =>
  gagal('MODE_DEMO', 'Mode demo tanpa basis data: perubahan tidak dapat disimpan.');

/** Ubah galat Prisma yang umum menjadi pesan yang bisa ditampilkan ke admin. */
function dariGalatPrisma<T>(e: unknown, konflik: string): Hasil<T> {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return gagal('KONFLIK', konflik);
    if (e.code === 'P2003') return gagal('KONFLIK', 'Data masih dipakai oleh data lain.');
    if (e.code === 'P2025') return gagal('TIDAK_DITEMUKAN', 'Data tidak ditemukan.');
  }
  throw e;
}

const rapikanTarif = (aturan: AturanTarif[]): AturanTarif[] =>
  aturan.map((a) => ({
    tipeHari: a.tipeHari,
    jamMulai: Number(a.jamMulai),
    jamSelesai: Number(a.jamSelesai),
    hargaPerJam: Number(a.hargaPerJam),
  }));

const rapikanJam = (baris: BarisJam[]): BarisJam[] =>
  baris.map((b) => ({ hari: Number(b.hari), buka: b.buka === true, jamBuka: Number(b.jamBuka), jamTutup: Number(b.jamTutup) }));

/** Ganti seluruh tarif satu lapangan dalam satu transaksi (pesanan lama memakai snapshot). */
export async function simpanTarif(lapanganId: number, masukan: AturanTarif[]): Promise<Hasil> {
  if (DEMO) return modeDemo();
  if (!Number.isInteger(lapanganId) || lapanganId <= 0) return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');

  const l = await db.lapangan.findUnique({ where: { id: lapanganId }, select: { id: true, jamOperasional: true } });
  if (!l) return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');

  if (!Array.isArray(masukan)) return gagal('VALIDASI', 'Format tarif tidak valid.');
  const aturan = rapikanTarif(masukan);
  const galat = validasiTarif(aturan, l.jamOperasional);
  if (galat.length) return gagal('VALIDASI', galat[0]);

  try {
    await db.$transaction(async (tx) => {
      await tx.tarif.deleteMany({ where: { lapanganId } });
      if (aturan.length) {
        await tx.tarif.createMany({
          data: aturan.map((a) => ({ lapanganId, ...a })),
        });
      }
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Tarif bertabrakan dengan data lain.');
  }
}

/** Ganti jam operasional 7 hari; perubahan ditolak bila menyisakan jam tanpa tarif. */
export async function simpanJam(lapanganId: number, masukan: BarisJam[]): Promise<Hasil> {
  if (DEMO) return modeDemo();
  if (!Number.isInteger(lapanganId) || lapanganId <= 0) return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');

  const l = await db.lapangan.findUnique({ where: { id: lapanganId }, select: { id: true, tarif: true } });
  if (!l) return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');

  if (!Array.isArray(masukan)) return gagal('VALIDASI', 'Format jam operasional tidak valid.');
  const baris = rapikanJam(masukan);
  const galat = validasiJamOperasional(baris, l.tarif);
  if (galat.length) return gagal('VALIDASI', galat[0]);

  try {
    await db.$transaction(async (tx) => {
      await tx.jamOperasional.deleteMany({ where: { lapanganId } });
      await tx.jamOperasional.createMany({
        data: baris.map((b) => ({ lapanganId, ...b })),
      });
    });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Jam operasional bentrok dengan data lain.');
  }
}

/** Tambah (tanpa `id`) atau ubah lapangan beserta fasilitasnya. Tanpa hapus fisik (BR-17). */
export async function simpanLapangan(input: InputLapangan, id?: number): Promise<Hasil<number>> {
  if (DEMO) return modeDemo();

  const nama = input.nama.trim();
  const namaDipakai = await db.lapangan.findFirst({
    where: { nama: { equals: nama, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  }).then((r) => r !== null);

  const galat = validasiLapangan({ ...input, nama }, { namaDipakai });
  if (galat.length) return gagal('VALIDASI', galat[0]);

  const jenis = await db.jenisOlahraga.findUnique({ where: { id: input.jenisOlahragaId }, select: { id: true } });
  if (!jenis) return gagal('VALIDASI', 'Jenis olahraga tidak ditemukan.');

  const ids = [...new Set(input.fasilitasIds)];
  if (ids.length) {
    const ada = await db.fasilitas.count({ where: { id: { in: ids } } });
    if (ada !== ids.length) return gagal('VALIDASI', 'Ada fasilitas yang tidak ditemukan.');
  }

  const data = {
    jenisOlahragaId: input.jenisOlahragaId,
    nama,
    deskripsi: input.deskripsi?.trim() || null,
    alamat: input.alamat?.trim() || null,
    latitude: input.latitude === null ? null : new Prisma.Decimal(Math.round(input.latitude * 1e6) / 1e6),
    longitude: input.longitude === null ? null : new Prisma.Decimal(Math.round(input.longitude * 1e6) / 1e6),
    aktif: input.aktif,
  };

  try {
    const lapanganId = await db.$transaction(async (tx) => {
      const l = id
        ? await tx.lapangan.update({ where: { id }, data, select: { id: true } })
        : await tx.lapangan.create({ data, select: { id: true } });

      await tx.lapanganFasilitas.deleteMany({ where: { lapanganId: l.id } });
      if (ids.length) {
        await tx.lapanganFasilitas.createMany({
          data: ids.map((fasilitasId) => ({ lapanganId: l.id, fasilitasId })),
        });
      }

      // Lapangan baru langsung punya jam standar 7 hari (FR-ADM-04) agar admin tinggal mengisi tarif.
      if (!id) {
        await tx.jamOperasional.createMany({
          data: HARI.map((hari) => ({ lapanganId: l.id, hari, buka: true, jamBuka: JAM_MIN, jamTutup: JAM_MAKS })),
        });
      }
      return l.id;
    });
    return { ok: true, data: lapanganId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');
    }
    return dariGalatPrisma(e, 'Nama lapangan sudah dipakai.');
  }
}

/** Nonaktif/aktifkan lapangan tanpa menyentuh pesanan atau riwayat (BR-17/18). */
export async function ubahAktifLapangan(id: number, aktif: boolean): Promise<Hasil> {
  if (DEMO) return modeDemo();
  if (typeof aktif !== 'boolean') return gagal('VALIDASI', 'Status aktif tidak valid.');
  try {
    await db.lapangan.update({ where: { id }, data: { aktif }, select: { id: true } });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Lapangan tidak dapat diubah.');
  }
}

// ─── Master jenis olahraga & fasilitas ──────────────────────────────────────

const rapikanNama = (nama: unknown): string => (typeof nama === 'string' ? nama.trim() : '');

function validasiNamaMaster(nama: string): string | null {
  if (nama.length < 2) return 'Nama minimal 2 karakter.';
  if (nama.length > 40) return 'Nama maksimal 40 karakter.';
  return null;
}

export async function tambahJenis(nama: unknown): Promise<Hasil<number>> {
  if (DEMO) return modeDemo();
  const n = rapikanNama(nama);
  const galat = validasiNamaMaster(n);
  if (galat) return gagal('VALIDASI', galat);
  try {
    const j = await db.jenisOlahraga.create({ data: { nama: n }, select: { id: true } });
    return { ok: true, data: j.id };
  } catch (e) {
    return dariGalatPrisma(e, 'Jenis olahraga sudah ada.');
  }
}

export async function ubahJenis(id: number, nama: unknown): Promise<Hasil> {
  if (DEMO) return modeDemo();
  const n = rapikanNama(nama);
  const galat = validasiNamaMaster(n);
  if (galat) return gagal('VALIDASI', galat);
  try {
    await db.jenisOlahraga.update({ where: { id }, data: { nama: n }, select: { id: true } });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Jenis olahraga sudah ada.');
  }
}

export async function hapusJenis(id: number): Promise<Hasil> {
  if (DEMO) return modeDemo();
  const dipakai = await db.lapangan.count({ where: { jenisOlahragaId: id } });
  if (dipakai > 0) return gagal('KONFLIK', `Jenis olahraga masih dipakai ${dipakai} lapangan.`);
  try {
    await db.jenisOlahraga.delete({ where: { id } });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Jenis olahraga tidak dapat dihapus.');
  }
}

export async function tambahFasilitas(nama: unknown): Promise<Hasil<number>> {
  if (DEMO) return modeDemo();
  const n = rapikanNama(nama);
  const galat = validasiNamaMaster(n);
  if (galat) return gagal('VALIDASI', galat);
  try {
    const f = await db.fasilitas.create({ data: { nama: n }, select: { id: true } });
    return { ok: true, data: f.id };
  } catch (e) {
    return dariGalatPrisma(e, 'Fasilitas sudah ada.');
  }
}

export async function ubahFasilitas(id: number, nama: unknown): Promise<Hasil> {
  if (DEMO) return modeDemo();
  const n = rapikanNama(nama);
  const galat = validasiNamaMaster(n);
  if (galat) return gagal('VALIDASI', galat);
  try {
    await db.fasilitas.update({ where: { id }, data: { nama: n }, select: { id: true } });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Fasilitas sudah ada.');
  }
}

export async function hapusFasilitas(id: number): Promise<Hasil> {
  if (DEMO) return modeDemo();
  const dipakai = await db.lapanganFasilitas.count({ where: { fasilitasId: id } });
  if (dipakai > 0) return gagal('KONFLIK', `Fasilitas masih dipakai ${dipakai} lapangan.`);
  try {
    await db.fasilitas.delete({ where: { id } });
    return { ok: true, data: undefined };
  } catch (e) {
    return dariGalatPrisma(e, 'Fasilitas tidak dapat dihapus.');
  }
}
