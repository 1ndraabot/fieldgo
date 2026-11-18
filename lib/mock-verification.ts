import { tariffFor } from "./availability";
import { getCourtDetail } from "./court-detail";
import { addDays, dayIndex, wibNow } from "./datetime";
import { MOCK_BANK } from "./mock-order";

/**
 * DATA CONTOH Admin — Verifikasi (frontend saja). Dikelola terpisah agar mudah diganti dengan data backend:
 * antrean bukti = pesanan "Menunggu verifikasi"; antrean pembatalan = pesanan "Pengajuan pembatalan".
 */
export type ProofInfo = { kind: "image" | "pdf"; fileName: string; bank: string; amount: number; paidAtMs: number };
export type PaymentItem = {
  kode: string; penyewa: string; kontak: string; courtId: string; courtName: string;
  date: string; hours: number[]; total: number; uploadedAtMs: number; proof: ProofInfo;
};
export type CancelItem = {
  kode: string; pemesan: string; kontak: string; courtId: string; courtName: string;
  date: string; hours: number[]; total: number; alasan: string;
  refund: { bank: string; rekening: string; atasNama: string }; diajukanAtMs: number;
};
export type VerificationData = { payments: PaymentItem[]; cancellations: CancelItem[]; bank: typeof MOCK_BANK };

const HOUR = 3_600_000;

/** Tanggal terdekat (≥ minOffset hari dari hari ini) pada hari tertentu (0=Senin … 6=Minggu). */
function nextDay(today: string, minOffset: number, weekday: number): string {
  let d = addDays(today, minOffset);
  while (dayIndex(d) !== weekday) d = addDays(d, 1);
  return d;
}

function priced(courtId: string, date: string, hours: number[]) {
  const court = getCourtDetail(courtId)!;
  return { courtId, courtName: court.name, date, hours, total: hours.reduce((a, h) => a + (tariffFor(court, date, h) ?? 0), 0) };
}

export function buildVerificationData(nowMs: number): VerificationData {
  const today = wibNow(nowMs).dateISO;
  const proof = (kind: ProofInfo["kind"], total: number, uploadedAtMs: number): ProofInfo => ({
    kind, fileName: kind === "pdf" ? "bukti-transfer.pdf" : "bukti-transfer.jpg",
    bank: MOCK_BANK.name, amount: total, paidAtMs: uploadedAtMs - 2 * 60_000,
  });

  const p1 = priced("futsal-arena-a", nextDay(today, 2, 5), [20, 21]);
  const p2 = priced("badminton-court-1", nextDay(today, 1, 4), [19]);
  const p3 = priced("basket-outdoor", nextDay(today, 2, 6), [16, 17]); // melewati dua tarif

  const payments: PaymentItem[] = [
    { kode: "GH-7K4M2Q", penyewa: "Rani Putri", kontak: "0812-3456-7890", ...p1, uploadedAtMs: nowMs - 3 * HOUR, proof: proof("image", p1.total, nowMs - 3 * HOUR) },
    { kode: "GH-H3N8TW", penyewa: "Dimas Pratama", kontak: "0813-xxxx-4411", ...p2, uploadedAtMs: nowMs - 2 * HOUR, proof: proof("pdf", p2.total, nowMs - 2 * HOUR) },
    { kode: "GH-S9D5PX", penyewa: "Sinta Wulandari", kontak: "0857-xxxx-9082", ...p3, uploadedAtMs: nowMs - 1 * HOUR, proof: proof("image", p3.total, nowMs - 1 * HOUR) },
  ];

  const c1 = priced("badminton-court-1", nextDay(today, 3, 0), [19]);
  const c2 = priced("tenis-lapangan-1", nextDay(today, 4, 6), [9]);
  const c3 = priced("futsal-arena-a", nextDay(today, 8, 5), [20, 21]);

  const cancellations: CancelItem[] = [
    { kode: "GH-4P9XCD", pemesan: "Rina Pratama", kontak: "0821-xxxx-3307", ...c1, alasan: "Ada acara keluarga mendadak",
      refund: { bank: "Bank BCA", rekening: "8830123456", atasNama: "Rina Pratama" }, diajukanAtMs: nowMs - 5 * HOUR },
    { kode: "GH-W5R2ZB", pemesan: "Budi Santoso", kontak: "0812-xxxx-6620", ...c2, alasan: "Sakit, tidak bisa bermain",
      refund: { bank: "Bank Mandiri", rekening: "1230009876543", atasNama: "Budi Santoso" }, diajukanAtMs: nowMs - 3 * HOUR },
    { kode: "GH-C8V6FN", pemesan: "Sari Wulandari", kontak: "0878-xxxx-1945", ...c3, alasan: "Tim lawan membatalkan pertandingan",
      refund: { bank: "Bank BNI", rekening: "0456789123", atasNama: "Sari Wulandari" }, diajukanAtMs: nowMs - 1 * HOUR },
  ];

  return { payments, cancellations, bank: MOCK_BANK };
}
