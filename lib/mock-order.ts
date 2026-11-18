import { addDays, dayIndex, wibNow } from "./datetime";
import { paymentDeadlineMs } from "./payment-deadline";

/**
 * DATA CONTOH untuk halaman Pembayaran (frontend saja). Dikelola terpisah agar mudah diganti:
 * ganti `loadPaymentOrder` dengan pemanggilan backend (GET pesanan milik pengguna) tanpa mengubah komponen.
 */
export type PaymentOrder = {
  kode: string;
  courtId: string;
  courtName: string;
  date: string;            // YYYY-MM-DD (WIB)
  hours: number[];         // jam mulai tiap slot
  ratePerHour: number[];   // harga terkunci per slot (sejajar dengan hours)
  total: number;
  createdAtMs: number;
  deadlineMs: number;      // batas_bayar_pada
  serverNowMs: number;
  bank: { name: string; accountName: string; accountNumber: string };
};

export const MOCK_BANK = { name: "Bank BCA", accountName: "Gelanggang Sport", accountNumber: "1234567890" };
export const MOCK_USER = { name: "Rani Putri" };

type Opts = { remainingSec?: number };

/**
 * Pesanan contoh mengikuti desain: Futsal Arena A, Sabtu malam 20.00–22.00 (2 jam × Rp 150.000),
 * dibuat ±19 menit lalu → sisa ±23:41. Tanggal dihitung relatif terhadap "sekarang" agar selalu valid.
 * `remainingSec` hanya untuk mencoba tampilan countdown/kedaluwarsa (?sisa=15).
 */
export function buildMockOrder(kode: string, nowMs: number, opts: Opts = {}): PaymentOrder {
  const today = wibNow(nowMs).dateISO;
  let date = addDays(today, 2);
  while (dayIndex(date) !== 5) date = addDays(date, 1); // Sabtu terdekat (≥ 2 hari lagi)

  const hours = [20, 21];
  const ratePerHour = [150000, 150000];
  const createdAtMs = nowMs - (18 * 60 + 52) * 1000;
  const deadlineMs = opts.remainingSec !== undefined
    ? nowMs + opts.remainingSec * 1000
    : paymentDeadlineMs(createdAtMs, date, hours[0], 24);

  return {
    kode, courtId: "futsal-arena-a", courtName: "Futsal Arena A", date, hours, ratePerHour,
    total: ratePerHour.reduce((a, b) => a + b, 0), createdAtMs, deadlineMs, serverNowMs: nowMs, bank: MOCK_BANK,
  };
}

export function loadPaymentOrder(kode: string, nowMs: number, opts?: Opts): PaymentOrder {
  return buildMockOrder(kode, nowMs, opts);
}
