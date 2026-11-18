/**
 * Daftar Pesanan Admin (FR-ADM-11), FRONTEND SAJA. Murni dan dapat diuji:
 * pencarian (kode / nama penyewa), filter status, dan pagination.
 */
import { MONTHS_SHORT, dayOfMonth, hourLabel } from "./datetime";

export type OrderStatus =
  | "menunggu_pembayaran" | "menunggu_verifikasi" | "terkonfirmasi" | "pengajuan_pembatalan"
  | "ditolak" | "kedaluwarsa" | "dibatalkan" | "selesai";

/** Urutan dan label status (PRD Bagian 5). */
export const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "menunggu_pembayaran", label: "Menunggu pembayaran" },
  { value: "menunggu_verifikasi", label: "Menunggu verifikasi" },
  { value: "terkonfirmasi", label: "Terkonfirmasi" },
  { value: "pengajuan_pembatalan", label: "Pengajuan pembatalan" },
  { value: "ditolak", label: "Ditolak" },
  { value: "kedaluwarsa", label: "Kedaluwarsa" },
  { value: "dibatalkan", label: "Dibatalkan" },
  { value: "selesai", label: "Selesai" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label])) as Record<OrderStatus, string>;

export type StatusFilter = "semua" | OrderStatus;

export type AdminOrder = {
  kode: string;
  penyewa: string;
  courtId: string;
  courtName: string;
  date: string;        // YYYY-MM-DD (WIB)
  startHour: number;
  hours: number;       // durasi (jam)
  total: number;       // harga terkunci
  status: OrderStatus;
  createdAtMs: number;
};

export const PAGE_SIZE = 6;

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const alnum = (s: string) => fold(s).replace(/[^a-z0-9]/g, "");

/** Cocok bila kata kunci ada di kode (abaikan tanda hubung/spasi) atau di nama penyewa (abaikan huruf besar & aksen). */
export function matchesQuery(o: AdminOrder, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const code = alnum(q);
  return (code !== "" && alnum(o.kode).includes(code)) || fold(o.penyewa).includes(fold(q).replace(/\s+/g, " "));
}

/** Pencarian dan filter status berlaku bersamaan. */
export function filterOrders(orders: AdminOrder[], query: string, status: StatusFilter): AdminOrder[] {
  return orders.filter((o) => (status === "semua" || o.status === status) && matchesQuery(o, query));
}

export const isFiltering = (query: string, status: StatusFilter) => query.trim() !== "" || status !== "semua";

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length, from: items.length ? (current - 1) * size + 1 : 0, to: Math.min(current * size, items.length) };
}

export const rangeText = (from: number, to: number, total: number) => (total ? `Menampilkan ${from} sampai ${to} dari ${total} pesanan` : "");

export const durationLabel = (hours: number) => `${hours} jam`;
export const dateShort = (iso: string) => `${dayOfMonth(iso)} ${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** "7 Nov 2026, 20.00 sampai 22.00" */
export const scheduleLabel = (o: Pick<AdminOrder, "date" | "startHour" | "hours">) =>
  `${dateShort(o.date)}, ${hourLabel(o.startHour)} sampai ${hourLabel(o.startHour + o.hours)}`;

export const newestFirst = (orders: AdminOrder[]) => [...orders].sort((a, b) => b.createdAtMs - a.createdAtMs);
