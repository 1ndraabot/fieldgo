import { createHash, timingSafeEqual } from 'node:crypto';
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

/** Mapping status Midtrans ke status internal. */
export function petakanStatusMidtrans(transactionStatus: string, fraudStatus?: string | null): StatusBayar {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'accept' || !fraudStatus ? 'dibayar' : 'perlu_tinjau';
    case 'settlement':
      return 'dibayar';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'gagal';
    case 'expire':
      return 'kedaluwarsa';
    case 'refund':
      return 'refund';
    case 'partial_refund':
      return 'sebagian_refund';
    case 'chargeback':
    case 'partial_chargeback':
      return 'perlu_tinjau';
    default:
      return 'perlu_tinjau';
  }
}

/** SHA-512(order_id + status_code + gross_amount + server_key) — dokumentasi Midtrans. */
export function signatureMidtrans(i: { orderId: string; statusCode: string; grossAmount: string; serverKey: string }): string {
  return createHash('sha512')
    .update(`${i.orderId}${i.statusCode}${i.grossAmount}${i.serverKey}`)
    .digest('hex');
}

export function signatureCocok(diterima: string, diharapkan: string): boolean {
  const a = Buffer.from(diterima.toLowerCase());
  const b = Buffer.from(diharapkan.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Nominal notifikasi harus sama persis dengan nominal yang disimpan saat transaksi dibuat. */
export const nominalCocok = (notif: number | null, db: number): boolean => notif === null || notif === db;
