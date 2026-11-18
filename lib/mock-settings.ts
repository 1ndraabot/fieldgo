import { MOCK_BANK } from "./mock-order";
import { DEFAULT_CANCEL_DAYS, DEFAULT_PAYMENT_HOURS, type SettingsForm } from "./admin-settings";

/**
 * DATA CONTOH Admin — Pengaturan (frontend saja). Rekening sama dengan yang tampil di halaman Pembayaran;
 * batas bayar dan batas pembatalan memakai nilai awal PRD. Ganti dengan data backend (tabel Pengaturan:
 * rekening_tujuan, batas_bayar_jam, batas_pembatalan_hari).
 */
export function buildSettings(): SettingsForm {
  return {
    bank: MOCK_BANK.name,
    rek: MOCK_BANK.accountNumber,
    an: MOCK_BANK.accountName,
    bayar: String(DEFAULT_PAYMENT_HOURS),
    batal: String(DEFAULT_CANCEL_DAYS),
  };
}
