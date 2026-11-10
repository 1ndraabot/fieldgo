import { db } from '../db.ts';
import { DEMO, demoHalamanBayar } from '../demo.ts';
import type { StatusPesanan } from '../slots.ts';

export type HalamanBayar = {
  kode: string; status: StatusPesanan; batasBayarPada: Date; dibuatPada: Date; alasanPenolakan: string | null;
  lapanganNama: string; tanggal: string; jamMulai: number; jamSelesai: number; totalHarga: number;
  slot: { jam: number; harga: number }[];
  rekening: { bank: string; nomor: string; nama: string } | null;
};

/** Kepemilikan di kueri: pesanan orang lain → null (halaman 404). `penggunaId` dari sesi server. */
export async function getHalamanBayar(kode: string, penggunaId: number): Promise<HalamanBayar | null> {
  if (DEMO) return demoHalamanBayar(kode, new Date()); // tanpa database: data contoh
  const [p, pengaturan] = await Promise.all([
    db.pesanan.findFirst({
      where: { kodePesanan: kode, penggunaId },
      include: { lapangan: { select: { nama: true } }, slot: { orderBy: { jam: 'asc' }, select: { jam: true, hargaPerJam: true } } },
    }),
    db.pengaturan.findMany({ where: { nama: { in: ['rekening_bank', 'rekening_nomor', 'rekening_nama'] } } }),
  ]);
  if (!p) return null;
  const v = Object.fromEntries(pengaturan.map((x) => [x.nama, x.nilai]));
  return {
    kode: p.kodePesanan, status: p.status, batasBayarPada: p.batasBayarPada, dibuatPada: p.dibuatPada, alasanPenolakan: p.alasanPenolakan,
    lapanganNama: p.lapangan.nama, tanggal: p.tanggalMain.toISOString().slice(0, 10), jamMulai: p.jamMulai, jamSelesai: p.jamSelesai,
    totalHarga: p.totalHarga, slot: p.slot.map((s) => ({ jam: s.jam, harga: s.hargaPerJam })),
    rekening: v.rekening_bank && v.rekening_nomor && v.rekening_nama ? { bank: v.rekening_bank, nomor: v.rekening_nomor, nama: v.rekening_nama } : null,
  };
}
