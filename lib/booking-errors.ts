/** Kode & pesan kesalahan pemesanan — dipakai server (API) dan klien (tampilan). */
export type BookingErrorCode =
  | "UNAUTHENTICATED" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_DISABLED" | "INVALID_INPUT"
  | "COURT_NOT_FOUND" | "COURT_INACTIVE" | "NOT_CONTIGUOUS" | "SLOT_PAST"
  | "SLOT_UNAVAILABLE" | "SLOT_TAKEN" | "INTERNAL";

export const ERROR_STATUS: Record<BookingErrorCode, number> = {
  UNAUTHENTICATED: 401, EMAIL_NOT_VERIFIED: 403, ACCOUNT_DISABLED: 403, INVALID_INPUT: 422,
  COURT_NOT_FOUND: 404, COURT_INACTIVE: 422, NOT_CONTIGUOUS: 422, SLOT_PAST: 422,
  SLOT_UNAVAILABLE: 422, SLOT_TAKEN: 409, INTERNAL: 500,
};

export const ERROR_MESSAGE: Record<BookingErrorCode, string> = {
  UNAUTHENTICATED: "Kamu belum masuk. Masuk dulu untuk memesan; pilihan jam kamu tetap tersimpan.",
  EMAIL_NOT_VERIFIED: "Email kamu belum diverifikasi, jadi belum bisa memesan. Verifikasi email dulu.",
  ACCOUNT_DISABLED: "Akun kamu dinonaktifkan dan tidak dapat membuat pesanan baru. Hubungi pengelola.",
  INVALID_INPUT: "Data pesanan tidak valid. Muat ulang halaman lalu pilih jam lagi.",
  COURT_NOT_FOUND: "Lapangan tidak ditemukan.",
  COURT_INACTIVE: "Lapangan ini sedang tidak menerima pesanan.",
  NOT_CONTIGUOUS: "Jam harus berurutan. Pilih jam yang bersebelahan.",
  SLOT_PAST: "Jam yang kamu pilih sudah lewat. Pilih jam lain.",
  SLOT_UNAVAILABLE: "Sebagian jam yang kamu pilih tidak bisa dipesan (di luar jam operasional, tanpa tarif, atau ditutup). Pilih jam lain.",
  SLOT_TAKEN: "Maaf, slot yang kamu pilih baru saja diambil orang lain. Kalender akan dimuat ulang agar kamu bisa memilih jam lain.",
  INTERNAL: "Pesanan belum bisa dibuat karena gangguan di server. Coba lagi sebentar lagi.",
};

export class BookingError extends Error {
  code: BookingErrorCode;
  constructor(code: BookingErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGE[code]);
    this.code = code;
  }
}
