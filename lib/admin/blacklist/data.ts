import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import { getAdminBlacklist, getAdminLapangan } from '../../demo-fe.ts';
import { wibSekarang } from '../../format.ts';
import type { InputBlokir } from './rules.ts';

export type BarisBlokir = {
  id: number;
  lapanganId: number;
  lapanganNama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jamMulai: number | null;
  jamSelesai: number | null;
  alasan: string;
  dibuatPada: Date;
  adminNama: string | null;
};

export type LapanganRingkas = { id: number; nama: string };

const hariIniWib = (now = new Date()): Date => new Date(`${wibSekarang(now).tanggal}T00:00:00.000Z`);

/** Blokir yang masih berlaku (tanggal selesai hari ini atau setelahnya). */
export async function getDaftarBlokir(now = new Date()): Promise<BarisBlokir[]> {
  if (DEMO) {
    const lapangan = getAdminLapangan();
    return getAdminBlacklist(now).baris
      .map((b) => ({
        id: b.id,
        lapanganId: lapangan.find((l) => l.nama === b.lapanganNama)?.id ?? 0,
        lapanganNama: b.lapanganNama,
        tanggalMulai: b.tanggalMulai,
        tanggalSelesai: b.tanggalSelesai,
        jamMulai: b.jamMulai,
        jamSelesai: b.jamSelesai,
        alasan: b.alasan,
        dibuatPada: now,
        adminNama: 'Admin FieldGo',
      }))
      .filter((b) => b.tanggalSelesai >= wibSekarang(now).tanggal);
  }

  const rows = await db.blokirJadwal.findMany({
    where: { tanggalSelesai: { gte: hariIniWib(now) } },
    orderBy: [{ tanggalMulai: 'asc' }, { jamMulai: 'asc' }],
    select: {
      id: true, lapanganId: true, tanggalMulai: true, tanggalSelesai: true,
      jamMulai: true, jamSelesai: true, alasan: true, dibuatPada: true,
      lapangan: { select: { nama: true } },
      admin: { select: { nama: true } },
    },
  });

  return rows.map((b) => ({
    id: b.id,
    lapanganId: b.lapanganId,
    lapanganNama: b.lapangan.nama,
    tanggalMulai: b.tanggalMulai.toISOString().slice(0, 10),
    tanggalSelesai: b.tanggalSelesai.toISOString().slice(0, 10),
    jamMulai: b.jamMulai,
    jamSelesai: b.jamSelesai,
    alasan: b.alasan,
    dibuatPada: b.dibuatPada,
    adminNama: b.admin?.nama ?? null,
  }));
}

/** Pilihan lapangan untuk form blokir. */
export async function getLapanganBlokir(): Promise<LapanganRingkas[]> {
  if (DEMO) return getAdminLapangan().map((l) => ({ id: l.id, nama: l.nama }));
  return db.lapangan.findMany({ orderBy: { nama: 'asc' }, select: { id: true, nama: true } });
}

/** Dipakai service untuk membedakan "tidak ditemukan" dari galat lain tanpa query ganda. */
export async function lapanganAda(id: number): Promise<boolean> {
  if (DEMO) return getAdminLapangan().some((l) => l.id === id);
  const l = await db.lapangan.findUnique({ where: { id }, select: { id: true } });
  return l !== null;
}
