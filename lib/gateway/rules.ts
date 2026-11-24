import { timingSafeEqual } from 'node:crypto';
import type { StatusPesanan } from '../slots.ts';
import type { StatusBayar } from './types.ts';

// Helper katalog kanal bebas Node; re-export agar pemanggil server cukup satu impor.
export {
  KANAL_BAYAR, kanalAktif, kanalDari, instruksiDariTransaksi, metodeDiizinkan,
  type GrupKanal, type KanalBayar,
} from './kanal.ts';

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

/** Mapping status Payment Requests v3 ke status internal. */
export function petakanStatusPaymentRequest(status: string): StatusBayar {
  switch (status.toUpperCase()) {
    case 'SUCCEEDED':
      return 'dibayar';
    case 'REQUIRES_ACTION':
    case 'PENDING':
    case 'ACCEPTING_PAYMENTS':
    case 'AUTHORIZED':
      return 'pending';
    case 'EXPIRED':
      return 'kedaluwarsa';
    case 'FAILED':
    case 'CANCELED':
    case 'CANCELLED':
      return 'gagal';
    default:
      return 'perlu_tinjau';
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

/**
 * Simulasi pembayaran test mode hanya untuk pengembangan: provider Xendit dengan kunci
 * test (xnd_development_) dan bukan production. Menentukan tampilnya tombol
 * "selesaikan pembayaran" yang memicu endpoint simulasi resmi Xendit.
 */
export function simulasiTestAktif(e: { provider: string; secretKey?: string; nodeEnv: string }): boolean {
  return e.nodeEnv !== 'production' && e.provider === 'xendit' && (e.secretKey ?? '').startsWith('xnd_development_');
}

/**
 * Peringatan salah konfigurasi env gateway untuk deploy produksi; kosong berarti aman.
 * Kesalahan di sini baru terasa saat pembayaran (kunci test di live, token kosong membuat
 * semua callback 401, APP_URL tidak HTTPS membuat redirect/callback gagal), jadi dicek
 * lebih awal saat server produksi menyala.
 */
export function peringatanEnvProduksi(e: {
  provider: string;
  secretKey?: string;
  callbackToken?: string;
  appUrl?: string;
}): string[] {
  if (e.provider !== 'xendit') {
    // `fake` sengaja diblokir di produksi oleh pilihGateway(); provider lain belum dikenal.
    return [`GATEWAY_PROVIDER="${e.provider}" tidak aktif di produksi — isi "xendit".`];
  }
  const hasil: string[] = [];
  if (!e.secretKey) hasil.push('XENDIT_SECRET_KEY kosong — transaksi tidak bisa dibuat.');
  else if (e.secretKey.startsWith('xnd_development_')) {
    hasil.push('XENDIT_SECRET_KEY masih kunci test (xnd_development_) — pakai kunci live (xnd_production_).');
  }
  if (!e.callbackToken) hasil.push('XENDIT_CALLBACK_TOKEN kosong — semua callback ditolak 401 sehingga pembayaran tak terkonfirmasi otomatis.');
  if (!e.appUrl) hasil.push('APP_URL kosong — redirect Xendit akan memakai http://localhost:3000.');
  else if (!e.appUrl.startsWith('https://')) hasil.push('APP_URL bukan HTTPS — Xendit memerlukan URL publik HTTPS untuk redirect/callback.');
  return hasil;
}
