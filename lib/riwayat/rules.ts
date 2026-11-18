// Aturan riwayat & pembatalan: fungsi murni, bisa diuji tanpa database.
import { wibSekarang } from '../format.ts';
import type { StatusPesanan } from '../slots.ts';

/**
 * Menunggu pembayaran yang sudah lewat batas ditampilkan sebagai Kedaluwarsa (BR-09)
 * tanpa menunggu worker mengubah statusnya di basis data.
 */
export function statusTampil(status: StatusPesanan, batasBayarPada: Date | null, now: Date): StatusPesanan {
  return status === 'menunggu_pembayaran' && batasBayarPada !== null && batasBayarPada <= now ? 'kedaluwarsa' : status;
}

/**
 * Pembatalan pesanan Terkonfirmasi hanya lewat form, paling lambat H-1 pukul 23.59 WIB (BR-12).
 * Artinya selama tanggal main (WIB) masih setelah hari ini.
 */
export function bisaAjukanBatal(status: StatusPesanan, tanggal: string, now: Date): boolean {
  return status === 'terkonfirmasi' && wibSekarang(now).tanggal < tanggal;
}

export type AjuanInput = { alasan: string; namaBank: string; nomorRekening: string; atasNama: string };
export type GalatAjuan = Record<string, string>;

/** Validasi form pengajuan pembatalan (FR-CAN-02). Nama & kontak diambil dari sesi, bukan dari klien. */
export function validasiAjuan(i: AjuanInput): GalatAjuan {
  const g: GalatAjuan = {};
  if (i.alasan.trim().length < 10) g.alasan = 'Tuliskan alasan minimal 10 karakter agar admin dapat menilai.';
  if (!i.namaBank.trim()) g.namaBank = 'Nama bank wajib diisi.';
  if (!i.nomorRekening.trim()) g.nomorRekening = 'Nomor rekening wajib diisi untuk pengembalian dana.';
  else if (!/^[0-9 .-]{5,30}$/.test(i.nomorRekening.trim())) g.nomorRekening = 'Nomor rekening hanya boleh angka, spasi, titik, atau tanda hubung.';
  if (!i.atasNama.trim()) g.atasNama = 'Nama pemilik rekening wajib diisi.';
  return g;
}
