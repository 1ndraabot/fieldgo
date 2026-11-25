/** Aturan murni antrean pengecualian, refund, dan putusan pembatalan (FR-ADM-06/07). */

export type AksiTinjau = 'terima' | 'refund';
export type AksiBatal = 'setujui' | 'tolak';
export type CaraRefund = 'gateway' | 'manual';

export const CATATAN_MIN = 5;
export const CATATAN_MAKS = 500;
export const CATATAN_SELESAI_MIN = 3;
export const REFUND_MAKS = 100_000_000;

/** Catatan penolakan otomatis bila admin mengosongkan kolom. */
export const CATATAN_TOLAK_DEFAULT =
  'Maaf, permintaan tidak dapat dilakukan karena bertentangan dengan ketentuan. ' +
  'Silakan hubungi call center yang ada. Terima kasih.';

const teks = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Aksi tinjau pembayaran bermasalah. Catatan wajib hanya untuk refund (alasan refund). */
export function validasiTinjau(aksi: unknown, catatan: string): string | null {
  if (aksi !== 'terima' && aksi !== 'refund') return 'Aksi tinjau harus "terima" atau "refund".';
  const c = teks(catatan);
  if (c.length > CATATAN_MAKS) return `Catatan maksimal ${CATATAN_MAKS} karakter.`;
  if (aksi === 'refund' && c.length < CATATAN_MIN) return `Tuliskan alasan refund minimal ${CATATAN_MIN} karakter.`;
  return null;
}

/**
 * Hanya pembayaran yang uangnya benar tetapi kedaluwarsa slot (telat) atau status pesanan
 * sempat berubah yang boleh diterima. Nominal tidak cocok / diduga fraud wajib di-refund.
 */
export function bolehTerima(alasanTinjau: string | null): boolean {
  return alasanTinjau === 'BAYAR_TERLAMBAT' || alasanTinjau === 'STATUS_PESANAN_BERUBAH';
}

/** Putusan pengajuan pembatalan: tolak wajib catatan (penyewa membacanya, FR-CAN-04). */
export function validasiPutusanBatal(aksi: unknown, catatan: string, nominalRefund?: number | null): string | null {
  if (aksi !== 'setujui' && aksi !== 'tolak') return 'Aksi harus "setujui" atau "tolak".';
  const c = teks(catatan);
  if (c.length > CATATAN_MAKS) return `Catatan maksimal ${CATATAN_MAKS} karakter.`;
  if (aksi === 'tolak' && c.length < CATATAN_MIN) {
    return `Penolakan wajib disertai catatan minimal ${CATATAN_MIN} karakter — catatan ini tampil di detail pesanan penyewa.`;
  }
  if (aksi === 'setujui' && nominalRefund !== null && nominalRefund !== undefined) {
    if (!Number.isInteger(nominalRefund) || nominalRefund < 0) return 'Nominal refund harus bilangan bulat nonnegatif.';
    if (nominalRefund > REFUND_MAKS) return 'Nominal refund tidak wajar.';
  }
  return null;
}

/** Refund baru yang dibuat admin langsung (mis. slot sudah dipakai orang lain). */
export function validasiRefundBaru(cara: unknown, nominal: unknown, alasan: string): string | null {
  if (cara !== 'gateway' && cara !== 'manual') return 'Cara refund harus "gateway" atau "manual".';
  if (!Number.isInteger(nominal) || (nominal as number) <= 0 || (nominal as number) > REFUND_MAKS) {
    return 'Nominal refund harus bilangan bulat positif.';
  }
  if (teks(alasan).length < CATATAN_MIN) return `Tuliskan alasan refund minimal ${CATATAN_MIN} karakter.`;
  return null;
}

/** Menandai refund manual sebagai selesai (admin sudah transfer). */
export function validasiSelesaikan(catatan: string): string | null {
  const c = teks(catatan);
  if (c.length < CATATAN_SELESAI_MIN) return `Tuliskan catatan transfer minimal ${CATATAN_SELESAI_MIN} karakter.`;
  if (c.length > CATATAN_MAKS) return `Catatan maksimal ${CATATAN_MAKS} karakter.`;
  return null;
}

/** Teks hasil sinkronisasi pembayaran untuk banner admin. */
export function labelHasilSinkron(h: string): string {
  switch (h) {
    case 'ok': return 'Pembayaran dikonfirmasi — pesanan kini Terkonfirmasi.';
    case 'kedaluwarsa': return 'Transaksi kedaluwarsa — slot dilepas dan pesanan Kedaluwarsa.';
    case 'gagal': return 'Transaksi gagal — pesanan tetap Menunggu pembayaran sampai batas waktu.';
    case 'pending': return 'Transaksi masih pending di gateway.';
    case 'duplikat': return 'Status ini sudah diproses sebelumnya.';
    case 'review_nominal': return 'Nominal tidak cocok — masuk antrean pengecualian.';
    case 'review_telat': return 'Pembayaran terlambat — masuk antrean pengecualian.';
    case 'review_status': return 'Status pesanan sudah berubah — masuk antrean pengecualian.';
    case 'perlu_tinjau': return 'Gateway meminta peninjauan — masuk antrean pengecualian.';
    case 'refund': return 'Status refund pada transaksi diperbarui.';
    case 'tidak_ditemukan': return 'Transaksi tidak ditemukan di gateway.';
    case 'abaikan': return 'Tidak ada perubahan yang diperlukan.';
    default: return 'Status diperbarui.';
  }
}
