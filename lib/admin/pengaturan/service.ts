import { Prisma } from '@prisma/client';
import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import { bacaPengaturan, type Pengaturan } from './data.ts';
import { validasiPengaturan, type InputPengaturan } from './rules.ts';

export type HasilPengaturan =
  | { ok: true; data: Pengaturan }
  | { ok: false; kode: 'MODE_DEMO' | 'VALIDASI'; pesan: string };

const gagal = (kode: 'MODE_DEMO' | 'VALIDASI', pesan: string): HasilPengaturan => ({ ok: false, kode, pesan });

/**
 * Simpan seluruh pengaturan dalam satu transaksi. Perubahan hanya memengaruhi pesanan baru;
 * pesanan lama memakai harga/batas waktu yang sudah dikunci (BR-06).
 */
export async function simpanPengaturan(masukan: InputPengaturan): Promise<HasilPengaturan> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: pengaturan tidak dapat disimpan.');

  const galat = validasiPengaturan(masukan);
  if (galat.length) return gagal('VALIDASI', galat[0]);

  const nilai: [string, Prisma.JsonNullValueInput | Prisma.InputJsonValue][] = [
    // Simpan dengan bentuk fieldgo (`atas_nama`), tanpa duplikat camelCase.
    ['rekening_tujuan', masukan.rekening
      ? { bank: masukan.rekening.bank, nomor: masukan.rekening.nomor, atas_nama: masukan.rekening.atasNama }
      : Prisma.JsonNull],
    ['batas_bayar_jam', masukan.batasBayarJam],
    ['batas_pembatalan_hari', masukan.batasPembatalanHari],
    ['gateway_aktif', masukan.gatewayAktif],
    ['metode_aktif', masukan.metodeAktif],
  ];

  try {
    await db.$transaction(
      nilai.map(([kunci, isi]) =>
        db.pengaturan.upsert({ where: { kunci }, create: { kunci, nilai: isi }, update: { nilai: isi } }),
      ),
    );
    return { ok: true, data: await bacaPengaturan() };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return gagal('VALIDASI', 'Pengaturan tidak ditemukan.');
    }
    throw e;
  }
}
