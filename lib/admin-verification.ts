/**
 * Aturan keputusan Admin — Verifikasi (FRONTEND SAJA, simulasi). Murni dan dapat diuji.
 * Mengikuti PRD: FR-ADM-06/07, BR-11 (penolakan bukti final, alasan wajib), FR-CAN-04.
 */
import { fmtRupiah } from "./data";

export const TEXT_MAX = 500;

export type Decision = "approved" | "rejected";
export type OrderStatus = "menunggu_verifikasi" | "terkonfirmasi" | "ditolak" | "pengajuan_pembatalan" | "dibatalkan";

/** Bukti disetujui → Terkonfirmasi; ditolak → Ditolak (final). */
export const statusAfterPayment = (d: Decision): OrderStatus => (d === "approved" ? "terkonfirmasi" : "ditolak");
/** Pembatalan disetujui → Dibatalkan; ditolak → kembali Terkonfirmasi. */
export const statusAfterCancellation = (d: Decision): OrderStatus => (d === "approved" ? "dibatalkan" : "terkonfirmasi");

export const MESSAGES = {
  reasonRequired: "Isi alasan penolakan terlebih dahulu.",
  noteRequired: "Catatan keputusan wajib diisi.",
  tooLong: `Maksimal ${TEXT_MAX} karakter.`,
  refundDigits: "Isi jumlah refund dengan angka saja, contoh: 150000.",
} as const;

export function validateRejectReason(text: string): string | null {
  const t = text.trim();
  if (!t) return MESSAGES.reasonRequired;
  return t.length > TEXT_MAX ? MESSAGES.tooLong : null;
}

export type RefundParse = { ok: true; amount: number | null } | { ok: false; message: string };

/** Nominal refund manual. Kosong/0 = tanpa refund. Menerima "150000", "150.000", "Rp 150.000". Maksimal = total dibayar. */
export function parseRefund(input: string, max: number): RefundParse {
  const raw = input.trim().replace(/^rp\s*/i, "");
  if (raw === "") return { ok: true, amount: null };
  if (!/^\d+$/.test(raw) && !/^\d{1,3}(\.\d{3})+$/.test(raw)) return { ok: false, message: MESSAGES.refundDigits };
  const amount = Number(raw.replace(/\./g, ""));
  if (amount > max) return { ok: false, message: `Jumlah refund tidak boleh melebihi total dibayar (${fmtRupiah(max)}).` };
  return { ok: true, amount: amount === 0 ? null : amount };
}

export type CancelErrors = { note?: string; refund?: string };

/** Catatan keputusan selalu wajib; nominal refund hanya diperiksa saat menyetujui. */
export function validateCancelDecision(p: { result: Decision; note: string; refundInput: string; maxRefund: number }): CancelErrors {
  const errors: CancelErrors = {};
  const n = p.note.trim();
  if (!n) errors.note = MESSAGES.noteRequired;
  else if (n.length > TEXT_MAX) errors.note = MESSAGES.tooLong;
  if (p.result === "approved") {
    const r = parseRefund(p.refundInput, p.maxRefund);
    if (!r.ok) errors.refund = r.message;
  }
  return errors;
}

/** "3 jam lalu", "25 menit lalu", "baru saja", "2 hari lalu" */
export function relativeTime(ms: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - ms) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

/** Antrean: terlama dulu (FR-ADM-06). */
export const sortOldestFirst = <T,>(items: T[], at: (t: T) => number): T[] => [...items].sort((a, b) => at(a) - at(b));
