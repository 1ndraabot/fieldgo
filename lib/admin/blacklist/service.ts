import { Prisma, type StatusPesanan } from '@prisma/client';
import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import { lapanganAda } from './data.ts';
import { validasiBlokir, type InputBlokir } from './rules.ts';

export type BentrokBlokir = {
  kode: string;
  tanggal: string;
  jamMulai: number;
  jamSelesai: number;
  status: StatusPesanan;
};

export type HasilBlokir<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; kode: 'MODE_DEMO' | 'VALIDASI' | 'TIDAK_DITEMUKAN' | 'KONFLIK'; pesan: string; bentrok?: BentrokBlokir[] };

const gagal = <T>(kode: 'MODE_DEMO' | 'VALIDASI' | 'TIDAK_DITEMUKAN' | 'KONFLIK', pesan: string, bentrok?: BentrokBlokir[]): HasilBlokir<T> =>
  bentrok ? { ok: false, kode, pesan, bentrok } : { ok: false, kode, pesan };

const STATUS_AKTIF: StatusPesanan[] = ['menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan'];

/** Pesanan aktif yang slotnya menimpa rentang blokir. Blokir tidak pernah membatalkannya (BR-14). */
export async function cariBentrok(i: InputBlokir, now = new Date()): Promise<BentrokBlokir[]> {
  if (DEMO) {
    // Mode demo tidak punya pesanan sungguhan; daftar bentrok contoh hanya untuk tampilan.
    return [];
  }

  const mulai = new Date(i.tanggalMulai + 'T00:00:00Z');
  const selesai = new Date(i.tanggalSelesai + 'T00:00:00Z');
  const rows = await db.slotPesanan.findMany({
    where: {
      lapanganId: i.lapanganId,
      aktif: true,
      tanggal: { gte: mulai, lte: selesai },
      ...(i.seharian ? {} : { jam: { gte: i.jamMulai!, lt: i.jamSelesai! } }),
      pesanan: { status: { in: STATUS_AKTIF } },
    },
    select: {
      jam: true,
      tanggal: true,
      pesanan: { select: { kodePesanan: true, status: true, batasBayarPada: true } },
    },
    orderBy: [{ tanggal: 'asc' }, { jam: 'asc' }],
  });

  // Satu pesanan bisa menempati beberapa slot: ringkas menjadi satu baris rentang.
  const peta = new Map<string, BentrokBlokir>();
  for (const r of rows) {
    const p = r.pesanan;
    // Menunggu pembayaran yang sudah lewat batas bukan pesanan berjalan (BR-09).
    if (p.status === 'menunggu_pembayaran' && p.batasBayarPada.getTime() <= now.getTime()) continue;

    const tanggal = r.tanggal.toISOString().slice(0, 10);
    const ada = peta.get(p.kodePesanan);
    if (ada) {
      ada.jamMulai = Math.min(ada.jamMulai, r.jam);
      ada.jamSelesai = Math.max(ada.jamSelesai, r.jam + 1);
    } else {
      peta.set(p.kodePesanan, { kode: p.kodePesanan, tanggal, jamMulai: r.jam, jamSelesai: r.jam + 1, status: p.status });
    }
  }
  return [...peta.values()].sort((a, b) => (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai));
}

/** Periksa validasi + bentrok tanpa menyimpan (dipakai tombol "Periksa bentrok"). */
export async function cekBlokir(i: InputBlokir, now = new Date()): Promise<HasilBlokir<BentrokBlokir[]>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: bentrok tidak dapat diperiksa.');
  const galat = validasiBlokir(i);
  if (galat.length) return gagal('VALIDASI', galat[0]);
  if (!(await lapanganAda(i.lapanganId))) return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');
  return { ok: true, data: await cariBentrok(i, now) };
}

/**
 * Simpan blokir. Bila ada pesanan aktif yang menimpa, klien wajib mengirim `abaikanBentrok`
 * setelah admin melihat daftar bentrok. Pesanan terdampak TIDAK dibatalkan (BR-14).
 */
export async function simpanBlokir(
  i: InputBlokir,
  adminId: number,
  abaikanBentrok: boolean,
  now = new Date(),
): Promise<HasilBlokir<{ id: number }>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: blokir tidak dapat disimpan.');

  const galat = validasiBlokir(i);
  if (galat.length) return gagal('VALIDASI', galat[0]);
  if (!(await lapanganAda(i.lapanganId))) return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');

  const bentrok = await cariBentrok(i, now);
  if (bentrok.length && !abaikanBentrok) {
    return gagal(
      'KONFLIK',
      `${bentrok.length} pesanan aktif memakai slot ini. Pesanan tersebut tidak akan dibatalkan; konfirmasi untuk tetap membuat blokir.`,
      bentrok,
    );
  }

  try {
    const b = await db.blokirJadwal.create({
      data: {
        lapanganId: i.lapanganId,
        tanggalMulai: new Date(i.tanggalMulai + 'T00:00:00Z'),
        tanggalSelesai: new Date(i.tanggalSelesai + 'T00:00:00Z'),
        jamMulai: i.jamMulai,
        jamSelesai: i.jamSelesai,
        alasan: i.alasan,
        dibuatOleh: adminId,
      },
      select: { id: true },
    });
    return { ok: true, data: { id: b.id } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return gagal('TIDAK_DITEMUKAN', 'Lapangan tidak ditemukan.');
    }
    throw e;
  }
}

export async function hapusBlokir(id: number): Promise<HasilBlokir> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: blokir tidak dapat dihapus.');
  try {
    await db.blokirJadwal.delete({ where: { id } });
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return gagal('TIDAK_DITEMUKAN', 'Blokir tidak ditemukan.');
    }
    throw e;
  }
}
