import { tariffFor } from "./availability";
import { getCourtDetail } from "./court-detail";
import { addDays, wibNow } from "./datetime";
import { newestFirst, type AdminOrder, type OrderStatus } from "./admin-orders";
import { buildVerificationData } from "./mock-verification";

/**
 * DATA CONTOH Admin — Daftar Pesanan (frontend saja). Mencakup kedelapan status PRD.
 * Pesanan Menunggu verifikasi dan Pengajuan pembatalan memakai kode yang sama dengan halaman Admin Verifikasi.
 * Ganti dengan data backend (Pesanan + Pengguna + Lapangan).
 */
const H = 3_600_000;
const D = 24 * H;

function priced(courtId: string, date: string, start: number, count: number) {
  const court = getCourtDetail(courtId)!;
  let total = 0;
  for (let h = start; h < start + count; h++) total += tariffFor(court, date, h) ?? 0;
  return { courtId, courtName: court.name, date, startHour: start, hours: count, total };
}

type Seed = [kode: string, penyewa: string, courtId: string, dayOffset: number, start: number, count: number, status: OrderStatus, createdAgoMs: number];

const SEEDS: Seed[] = [
  ["GH-B2F6KD", "Maya Lestari", "badminton-court-2", 3, 18, 1, "menunggu_pembayaran", 40 * 60_000],
  ["GH-J8Q3RV", "Fajar Nugroho", "futsal-arena-a", 4, 19, 2, "menunggu_pembayaran", 6 * H],
  ["GH-M4T9XW", "Intan Permata", "mini-soccer", 5, 16, 2, "terkonfirmasi", 2 * D],
  ["GH-Q7N2HC", "Andi Wijaya", "tenis-lapangan-1", 2, 9, 1, "terkonfirmasi", 3 * D],
  ["GH-X5M8EP", "Rani Putri", "futsal-arena-a", 6, 20, 2, "terkonfirmasi", 1 * D],
  ["GH-R6V4NT", "Budi Santoso", "badminton-court-1", 2, 20, 1, "ditolak", 2 * D + 5 * H],
  ["GH-Z9C5MB", "Sari Wulandari", "tenis-lapangan-1", 1, 15, 1, "kedaluwarsa", 3 * D + 2 * H],
  ["GH-T2G8YF", "Rina Pratama", "basket-outdoor", 4, 10, 2, "dibatalkan", 4 * D],
  ["GH-F7W3JS", "Rani Putri", "futsal-arena-a", -5, 20, 2, "selesai", 9 * D],
  ["GH-K4P6QU", "Maya Lestari", "badminton-court-1", -3, 19, 1, "selesai", 6 * D],
  ["GH-N8H2VD", "Fajar Nugroho", "mini-soccer", -8, 16, 2, "selesai", 12 * D],
];

export function buildOrdersData(nowMs: number): AdminOrder[] {
  const today = wibNow(nowMs).dateISO;
  const v = buildVerificationData(nowMs);

  const fromVerification: AdminOrder[] = [
    ...v.payments.map((p): AdminOrder => ({
      kode: p.kode, penyewa: p.penyewa, courtId: p.courtId, courtName: p.courtName, date: p.date, startHour: p.hours[0], hours: p.hours.length,
      total: p.total, status: "menunggu_verifikasi", createdAtMs: p.uploadedAtMs - 25 * 60_000,
    })),
    ...v.cancellations.map((c): AdminOrder => ({
      kode: c.kode, penyewa: c.pemesan, courtId: c.courtId, courtName: c.courtName, date: c.date, startHour: c.hours[0], hours: c.hours.length,
      total: c.total, status: "pengajuan_pembatalan", createdAtMs: c.diajukanAtMs - 2 * D,
    })),
  ];

  const others = SEEDS.map(([kode, penyewa, courtId, offset, start, count, status, ago]): AdminOrder => ({
    kode, penyewa, ...priced(courtId, addDays(today, offset), start, count), status, createdAtMs: nowMs - ago,
  }));

  return newestFirst([...fromVerification, ...others]);
}
