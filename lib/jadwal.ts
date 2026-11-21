import { labelPanjang, wibSekarang } from './format.ts';
import type { StatusPesanan } from './slots.ts';

export type PesananJadwal = {
  kode: string; lapanganNama: string; tanggal: string; // YYYY-MM-DD (WIB)
  jamMulai: number; jamSelesai: number; jumlahJam: number; totalHarga: number;
  status: StatusPesanan; batasBayarPada: Date;
};

/**
 * Isi halaman Jadwal saya: hanya Terkonfirmasi dan Menunggu pembayaran (permintaan user).
 * Yang sudah selesai main, atau menunggu tetapi sudah lewat batas bayar, disembunyikan di sini juga
 * agar tidak bergantung pada penjadwal yang mengubah statusnya (sama seperti status slot kalender).
 */
export function jadwalAktif(rows: PesananJadwal[], now: Date) {
  const w = wibSekarang(now);
  const terkonfirmasi = rows
    .filter((r) => r.status === 'terkonfirmasi' && (r.tanggal > w.tanggal || (r.tanggal === w.tanggal && r.jamSelesai > w.jam)))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jamMulai - b.jamMulai);
  const menunggu = rows
    .filter((r) => r.status === 'menunggu_pembayaran' && r.batasBayarPada > now)
    .sort((a, b) => a.batasBayarPada.getTime() - b.batasBayarPada.getTime());
  return { terkonfirmasi, menunggu };
}

/** Sisa waktu bayar, mis. "5 jam 12 menit". */
export function labelSisaWaktu(batas: Date, now: Date): string {
  const m = Math.floor((batas.getTime() - now.getTime()) / 60_000);
  if (batas.getTime() <= now.getTime()) return 'habis';
  if (m < 1) return 'kurang dari 1 menit';
  if (m < 60) return `${m} menit`;
  return `${Math.floor(m / 60)} jam${m % 60 ? ` ${m % 60} menit` : ''}`;
}

/** Batas bayar untuk tampilan, mis. "Minggu, 8 November · 12.34 WIB". */
export function labelBatasBayar(batas: Date): string {
  const w = new Date(batas.getTime() + 7 * 3600_000); // WIB = UTC+7
  const hh = String(w.getUTCHours()).padStart(2, '0');
  const mm = String(w.getUTCMinutes()).padStart(2, '0');
  return `${labelPanjang(w.toISOString().slice(0, 10))} · ${hh}.${mm} WIB`;
}
