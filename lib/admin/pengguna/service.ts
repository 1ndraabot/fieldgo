import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import { tolakUbahAktif } from './rules.ts';

export type HasilPengguna<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; kode: 'MODE_DEMO' | 'VALIDASI' | 'TIDAK_DITEMUKAN'; pesan: string };

const gagal = <T>(kode: 'MODE_DEMO' | 'VALIDASI' | 'TIDAK_DITEMUKAN', pesan: string): HasilPengguna<T> =>
  ({ ok: false, kode, pesan });

/**
 * Aktifkan/nonaktifkan akun penyewa. Menonaktifkan tidak menghapus data maupun pesanan:
 * sesi berikutnya langsung ditolak karena `ambilPengguna` mengabaikan akun nonaktif,
 * dan pesanan yang sedang berjalan tetap diproses (PRD 8.8).
 */
export async function ubahAktifPengguna(
  i: { aktorId: number; targetId: number; aktif: boolean },
  now = new Date(),
): Promise<HasilPengguna<{ id: number; aktif: boolean }>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: status pengguna tidak dapat diubah.');
  if (!Number.isInteger(i.targetId) || i.targetId <= 0) return gagal('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');

  const p = await db.pengguna.findUnique({
    where: { id: i.targetId },
    select: { id: true, peran: true, dinonaktifkanPada: true },
  });
  if (!p) return gagal('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');

  const tolak = tolakUbahAktif(i.aktorId, p, i.aktif);
  if (tolak) return gagal('VALIDASI', tolak);

  await db.pengguna.update({
    where: { id: i.targetId },
    data: { dinonaktifkanPada: i.aktif ? null : now },
  });

  return { ok: true, data: { id: i.targetId, aktif: i.aktif } };
}
