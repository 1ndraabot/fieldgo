/**
 * Draf pilihan pemesanan (lapangan, tanggal, jam). Disimpan sebelum tamu diarahkan
 * ke masuk/daftar supaya pilihan tetap ada setelah autentikasi (FR-PUB-05, AC-02).
 * Halaman /pesan membaca draf ini (atau query string yang sama) lalu memanggil clearDraft().
 */
export type BookingDraft = { courtId: string; date: string; hours: number[]; savedAt: number };

const KEY = "gh:booking-draft";
const TTL_MS = 2 * 60 * 60 * 1000;

export function saveDraft(d: Omit<BookingDraft, "savedAt">) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() })); } catch { /* penyimpanan tidak tersedia */ }
}

export function loadDraft(): BookingDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as BookingDraft;
    if (!d || typeof d.courtId !== "string" || typeof d.date !== "string" || !Array.isArray(d.hours)) return null;
    if (Date.now() - d.savedAt > TTL_MS) { window.localStorage.removeItem(KEY); return null; }
    return d;
  } catch { return null; }
}

export function clearDraft() {
  try { window.localStorage.removeItem(KEY); } catch { /* abaikan */ }
}

/** URL alur pemesanan dengan pilihan yang dibawa. */
export function bookingHref(d: Pick<BookingDraft, "courtId" | "date" | "hours">): string {
  const q = new URLSearchParams({ lapangan: d.courtId, tanggal: d.date, jam: [...d.hours].sort((a, b) => a - b).join(",") });
  return `/pesan?${q.toString()}`;
}
