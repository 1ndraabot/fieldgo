import type { InstruksiPembayaran } from './types.ts';

/**
 * Katalog kanal pembayaran Xendit Payment Requests v3 yang dipakai FieldGo.
 * File ini sengaja bebas dari modul Node agar aman diimpor komponen klien.
 *
 * `kode` = channel_code Xendit, `kodeAdmin` = nilai yang disimpan di Pengaturan.
 */
export type GrupKanal = 'qris' | 'va' | 'ewallet';

export type KanalBayar = {
  kode: string;
  label: string;
  grup: GrupKanal;
  kodeAdmin: string;
  bank?: string;
};

export const KANAL_BAYAR: readonly KanalBayar[] = [
  { kode: 'QRIS', label: 'QRIS', grup: 'qris', kodeAdmin: 'qris' },
  { kode: 'BCA_VIRTUAL_ACCOUNT', label: 'BCA Virtual Account', grup: 'va', kodeAdmin: 'va_bca', bank: 'BCA' },
  { kode: 'BNI_VIRTUAL_ACCOUNT', label: 'BNI Virtual Account', grup: 'va', kodeAdmin: 'va_bni', bank: 'BNI' },
  { kode: 'BRI_VIRTUAL_ACCOUNT', label: 'BRI Virtual Account', grup: 'va', kodeAdmin: 'va_bri', bank: 'BRI' },
  { kode: 'MANDIRI_VIRTUAL_ACCOUNT', label: 'Mandiri Virtual Account', grup: 'va', kodeAdmin: 'va_mandiri', bank: 'Mandiri' },
  { kode: 'PERMATA_VIRTUAL_ACCOUNT', label: 'Permata Virtual Account', grup: 'va', kodeAdmin: 'va_permata', bank: 'Permata' },
  { kode: 'DANA', label: 'DANA', grup: 'ewallet', kodeAdmin: 'dana' },
  { kode: 'SHOPEEPAY', label: 'ShopeePay', grup: 'ewallet', kodeAdmin: 'shopeepay' },
];

const VA_SEMUA = KANAL_BAYAR.filter((k) => k.grup === 'va').map((k) => k.kode);

/** Kode pengaturan lama (era Invoice/Midtrans) tetap dikenali agar data admin lama tidak hilang. */
const LEGACY: Record<string, readonly string[]> = {
  qris: ['QRIS'],
  bank_transfer: VA_SEMUA,
  echannel: ['MANDIRI_VIRTUAL_ACCOUNT'],
  shopeepay: ['SHOPEEPAY'],
};

export const kanalDari = (kode: string | null | undefined): KanalBayar | null =>
  KANAL_BAYAR.find((k) => k.kode === kode) ?? null;

/** Daftar kanal yang boleh dipilih penyewa. Kosong = semua kanal v3. */
export function kanalAktif(metodeAktif: readonly string[]): KanalBayar[] {
  if (!metodeAktif.length) return [...KANAL_BAYAR];
  const dipilih = new Set(metodeAktif);
  const hasil = KANAL_BAYAR.filter((k) => dipilih.has(k.kodeAdmin) || dipilih.has(k.kode));
  if (hasil.length) return hasil;

  // Hanya kode lama yang tersimpan: terjemahkan ke kanal v3 yang setara.
  const dariLama = new Set(metodeAktif.flatMap((m) => LEGACY[m] ?? []));
  return KANAL_BAYAR.filter((k) => dariLama.has(k.kode));
}

export function metodeDiizinkan(metode: string, metodeAktif: readonly string[]): boolean {
  return kanalAktif(metodeAktif).some((k) => k.kode === metode);
}

/**
 * Instruksi yang dirender sendiri dari kolom yang sudah ada (tanpa migrasi DB):
 * `token` = QR string / nomor VA, `redirect_url` = URL e-wallet.
 */
export function instruksiDariTransaksi(t: {
  metode: string | null;
  token: string | null;
  redirectUrl: string | null;
  kedaluwarsaPada: Date;
}): InstruksiPembayaran | null {
  const kanal = kanalDari(t.metode);
  if (!kanal) return null;
  if (kanal.grup === 'qris') {
    return t.token ? { jenis: 'qr', nilai: t.token, kedaluwarsaPada: t.kedaluwarsaPada } : null;
  }
  if (kanal.grup === 'va') {
    return t.token
      ? { jenis: 'va', nomor: t.token, bank: kanal.bank ?? kanal.label, kedaluwarsaPada: t.kedaluwarsaPada }
      : null;
  }
  return t.redirectUrl ? { jenis: 'redirect', url: t.redirectUrl, kedaluwarsaPada: t.kedaluwarsaPada } : null;
}
