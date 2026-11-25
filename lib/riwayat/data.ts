import { db } from '../db.ts';
import { DEMO } from '../demo.ts';
import { getDetailPesanan as demoDetail, getRiwayat as demoRiwayat } from '../demo-fe.ts';
import { statusTampil } from './rules.ts';
import type { BarisRiwayat, DetailPesanan, EntriRiwayat } from './types.ts';

const tanggalDari = (d: Date) => d.toISOString().slice(0, 10);
const namaBerkas = (kunci: string) => kunci.split('/').pop() ?? kunci;

/**
 * Riwayat seluruh pesanan milik satu penyewa, terbaru dulu (FR-HIS-02).
 * `penggunaId` HARUS dari sesi server, tidak pernah dari request (PRD 17.4).
 */
export async function getRiwayat(penggunaId: number, now = new Date()): Promise<BarisRiwayat[]> {
  if (DEMO) return demoRiwayat(now); // tanpa database: data contoh
  const rows = await db.pesanan.findMany({
    where: { penggunaId },
    select: {
      kodePesanan: true, lapanganId: true, tanggalMain: true, jamMulai: true, jamSelesai: true,
      jumlahJam: true, totalHarga: true, status: true, dibuatPada: true, batasBayarPada: true,
      alasanPenolakan: true, lapangan: { select: { nama: true } },
    },
    orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }],
    take: 200, // shortcut: riwayat satu penyewa kecil; beri pagination bila perlu
  });
  return rows.map((r) => ({
    kode: r.kodePesanan, lapanganId: r.lapanganId, lapanganNama: r.lapangan.nama,
    tanggal: tanggalDari(r.tanggalMain), jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, jumlahJam: r.jumlahJam,
    totalHarga: r.totalHarga, status: statusTampil(r.status, r.batasBayarPada, now),
    dibuatPada: r.dibuatPada, batasBayarPada: r.batasBayarPada, alasanPenolakan: r.alasanPenolakan,
  }));
}

const oleh = (diubahOleh: number | null, penggunaId: number) =>
  diubahOleh === null ? 'Sistem' : diubahOleh === penggunaId ? 'Penyewa' : 'Admin';

const KEPUTUSAN = { menunggu: 'menunggu', disetujui: 'disetujui', ditolak: 'ditolak' } as const;

/**
 * Detail satu pesanan milik `penggunaId` (FR-HIS-03). Kepemilikan ada di kueri:
 * pesanan orang lain diperlakukan sebagai tidak ada (null → 404).
 */
export async function getDetailPesanan(kode: string, penggunaId: number, now = new Date()): Promise<DetailPesanan | null> {
  if (DEMO) return demoDetail(kode, now); // tanpa database: data contoh
  const p = await db.pesanan.findFirst({
    where: { kodePesanan: kode, penggunaId },
    select: {
      kodePesanan: true, lapanganId: true, tanggalMain: true, jamMulai: true, jamSelesai: true,
      jumlahJam: true, totalHarga: true, status: true, dibuatPada: true, batasBayarPada: true,
      alasanPenolakan: true, lapangan: { select: { nama: true } },
      pembayaran: { select: { berkasBukti: true, diunggahPada: true } },
      riwayat: { orderBy: { waktu: 'asc' }, select: { statusBaru: true, diubahOleh: true, waktu: true, catatan: true } },
      pengajuanPembatalan: { select: { alasan: true, status: true, catatanAdmin: true } },
    },
  });
  if (!p) return null;

  const status = statusTampil(p.status, p.batasBayarPada, now);
  const riwayat: EntriRiwayat[] = p.riwayat.map((e) => ({
    waktu: e.waktu, statusBaru: e.statusBaru, oleh: oleh(e.diubahOleh, penggunaId), catatan: e.catatan,
  }));
  if (riwayat.length === 0) {
    riwayat.push({ waktu: p.dibuatPada, statusBaru: 'menunggu_pembayaran', oleh: 'Sistem', catatan: 'Pesanan dibuat, slot ditahan.' });
  }
  // Status tampil boleh lebih baru dari basis data bila batas bayar baru saja lewat (BR-09).
  if (status === 'kedaluwarsa' && p.status === 'menunggu_pembayaran') {
    riwayat.push({
      waktu: p.batasBayarPada, statusBaru: 'kedaluwarsa', oleh: 'Sistem',
      catatan: 'Batas bayar terlewati tanpa bukti; slot dilepas.',
    });
  }

  return {
    kode: p.kodePesanan, lapanganId: p.lapanganId, lapanganNama: p.lapangan.nama,
    tanggal: tanggalDari(p.tanggalMain), jamMulai: p.jamMulai, jamSelesai: p.jamSelesai, jumlahJam: p.jumlahJam,
    totalHarga: p.totalHarga, status, dibuatPada: p.dibuatPada, batasBayarPada: p.batasBayarPada,
    alasanPenolakan: p.alasanPenolakan,
    riwayat,
    bukti: p.pembayaran && { namaBerkas: namaBerkas(p.pembayaran.berkasBukti), diunggahPada: p.pembayaran.diunggahPada },
    pengajuanBatal: p.pengajuanPembatalan && {
      alasan: p.pengajuanPembatalan.alasan, keadaan: KEPUTUSAN[p.pengajuanPembatalan.status],
      catatanAdmin: p.pengajuanPembatalan.catatanAdmin,
    },
  };
}
