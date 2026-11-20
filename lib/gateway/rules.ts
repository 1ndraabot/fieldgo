import { timingSafeEqual } from 'node:crypto';
import type { StatusPesanan } from '../slots.ts';
import type { StatusBayar } from './types.ts';

/** Keputusan yang boleh diambil dari satu notifikasi. Fungsi murni, diuji tanpa database. */
export type PutusanNotifikasi =
  | 'konfirmasi'
  | 'review_nominal'
  | 'review_telat'
  | 'review_status'
  | 'perlu_tinjau'
  | 'kedaluwarsa'
  | 'gagal'
  | 'pending'
  | 'refund'
  | 'abaikan';

const SUDAH_DIBAYAR: StatusBayar[] = ['dibayar', 'refund', 'sebagian_refund'];

/**
 * Menentukan apa yang harus dilakukan atas notifikasi pembayaran.
 * Prinsip: status tidak pernah mundur, nominal harus sama, dan pembayaran setelah
 * batas waktu tidak boleh langsung mengonfirmasi pesanan.
 */
export function putusanNotifikasi(i: {
  status: StatusBayar;
  statusPembayaran: StatusBayar;
  statusPesanan: StatusPesanan;
  jumlahNotif: number | null;
  jumlahDb: number;
  waktuBayar: Date | null;
  batasBayar: Date;
  now: Date;
}): PutusanNotifikasi {
  const sudahDibayar = SUDAH_DIBAYAR.includes(i.statusPembayaran);

  // Transaksi yang sudah ditandai perlu tinjau menunggu keputusan admin. Notifikasi
  // pembayaran berikutnya tidak boleh mengonfirmasi sendiri; hanya refund yang dicatat.
  if (i.statusPembayaran === 'perlu_tinjau' && i.status !== 'refund' && i.status !== 'sebagian_refund') {
    return 'abaikan';
  }

  switch (i.status) {
    case 'pending':
      return sudahDibayar ? 'abaikan' : 'pending';
    case 'dibayar': {
      if (sudahDibayar) return 'abaikan';
      if (i.jumlahNotif !== null && i.jumlahNotif !== i.jumlahDb) return 'review_nominal';
      const waktu = i.waktuBayar ?? i.now;
      if (waktu.getTime() > i.batasBayar.getTime()) return 'review_telat';
      if (i.statusPesanan !== 'menunggu_pembayaran') return 'review_status';
      return 'konfirmasi';
    }
    case 'kedaluwarsa':
      return sudahDibayar ? 'abaikan' : 'kedaluwarsa';
    case 'gagal':
      return sudahDibayar ? 'abaikan' : 'gagal';
    case 'refund':
    case 'sebagian_refund':
      return 'refund';
    case 'perlu_tinjau':
      return 'perlu_tinjau';
    default:
      return 'abaikan';
  }
}

/** Mapping status invoice Xendit ke status internal. */
export function petakanStatusXendit(status: string): StatusBayar {
  switch (status.toUpperCase()) {
    case 'PAID':
    case 'SETTLED':
      return 'dibayar';
    case 'PENDING':
      return 'pending';
    case 'EXPIRED':
      return 'kedaluwarsa';
    case 'FAILED':
      return 'gagal';
    default:
      return 'perlu_tinjau';
  }
}

/**
 * Mapping callback refund Xendit. `succeeded` dan `pending` sama-sama berarti uang
 * dikembalikan (refund internal tetap `diproses` sampai callback sukses); status lain
 * diabaikan agar tidak mengubah pembayaran yang sudah lunas.
 */
export function petakanStatusRefundXendit(status: string): 'refund' | 'abaikan' {
  const s = status.toLowerCase();
  return s === 'succeeded' || s === 'pending' ? 'refund' : 'abaikan';
}

const METODE_XENDIT: Record<string, string[]> = {
  qris: ['QRIS'],
  gopay: ['GOPAY'],
  shopeepay: ['SHOPEEPAY'],
  bank_transfer: ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'],
  echannel: ['MANDIRI'],
  credit_card: ['CREDIT_CARD'],
};

/** Kode `metode_aktif` admin → daftar `payment_methods` Xendit. */
export function petakanMetodeXendit(kodes: string[]): string[] {
  const hasil: string[] = [];
  for (const kode of kodes) {
    for (const metode of METODE_XENDIT[kode] ?? []) {
      if (!hasil.includes(metode)) hasil.push(metode);
    }
  }
  return hasil;
}

/** Sisa waktu invoice dalam detik; Xendit menolak durasi 0/negatif, jadi beri batas bawah. */
export function durasiInvoiceDetik(kedaluwarsaPada: Date, now: Date): number {
  return Math.max(60, Math.ceil((kedaluwarsaPada.getTime() - now.getTime()) / 1000));
}

/**
 * Status akhir pembayaran setelah refund. Xendit tidak mengirim total invoice di callback,
 * jadi nominal yang lebih kecil dari tagihan dianggap refund sebagian.
 */
export function statusRefundTersimpan(status: StatusBayar, jumlahNotif: number | null, jumlahDb: number): 'refund' | 'sebagian_refund' {
  return status === 'sebagian_refund' || (status === 'refund' && jumlahNotif !== null && jumlahNotif < jumlahDb)
    ? 'sebagian_refund'
    : 'refund';
}

/** Perbandingan rahasia (callback token) tanpa membocorkan panjang/isi lewat waktu. */
export function samakanAmanWaktu(diterima: string, diharapkan: string): boolean {
  const a = Buffer.from(diterima);
  const b = Buffer.from(diharapkan);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Nominal notifikasi harus sama persis dengan nominal yang disimpan saat transaksi dibuat. */
export const nominalCocok = (notif: number | null, db: number): boolean => notif === null || notif === db;
