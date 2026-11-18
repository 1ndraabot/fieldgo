import type { SlotInfo } from "./availability";

export const NOT_CONTIGUOUS_MSG =
  "Jam harus berurutan. Pilih jam di samping pilihanmu, atau batalkan pilihan lebih dulu.";

export const isContiguous = (hours: number[]) => {
  const s = [...hours].sort((a, b) => a - b);
  return s.every((h, i) => i === 0 || h === s[i - 1] + 1);
};

/**
 * Aturan pilih jam (BR-03): pilihan selalu satu blok berurutan.
 * - jam di samping blok → blok diperpanjang
 * - jam tidak bersebelahan → ditolak dengan pesan
 * - jam di ujung blok → dilepas; jam di tengah → blok dipotong sebelum jam itu
 */
export function toggleHour(selected: number[], hour: number): { hours: number[]; error?: string } {
  const s = [...selected].sort((a, b) => a - b);
  if (s.length === 0) return { hours: [hour] };
  const min = s[0];
  const max = s[s.length - 1];
  if (s.includes(hour)) {
    if (hour === min || hour === max) return { hours: s.filter((h) => h !== hour) };
    return { hours: s.filter((h) => h < hour) };
  }
  if (hour === min - 1) return { hours: [hour, ...s] };
  if (hour === max + 1) return { hours: [...s, hour] };
  return { hours: s, error: NOT_CONTIGUOUS_MSG };
}

export type BreakdownRow = { from: number; to: number; count: number; rate: number; subtotal: number };

/** Kelompokkan jam berurutan yang harganya sama (PRD AC-05: total = jumlah harga tiap jam). */
export function buildBreakdown(slots: SlotInfo[], hours: number[]): { rows: BreakdownRow[]; total: number } {
  const rows: BreakdownRow[] = [];
  let total = 0;
  for (const h of [...hours].sort((a, b) => a - b)) {
    const rate = slots.find((s) => s.hour === h)?.price ?? 0;
    total += rate;
    const last = rows[rows.length - 1];
    if (last && last.rate === rate && last.to === h) {
      last.to = h + 1; last.count += 1; last.subtotal += rate;
    } else rows.push({ from: h, to: h + 1, count: 1, rate, subtotal: rate });
  }
  return { rows, total };
}

export const STRICT_NOT_CONTIGUOUS_MSG =
  "Jam harus berurutan. Pilih jam yang bersebelahan dengan pilihanmu, atau lepas dulu pilihan lama.";
export const RELEASE_END_MSG = "Lepas jam dari ujung rentang agar pilihan tetap berurutan.";

/** Versi halaman Pesan: jam di tengah rentang tidak bisa dilepas (sesuai desain referensi). */
export function toggleHourStrict(selected: number[], hour: number): { hours: number[]; error?: string } {
  const s = [...selected].sort((a, b) => a - b);
  if (s.length === 0) return { hours: [hour] };
  const min = s[0], max = s[s.length - 1];
  if (s.includes(hour)) {
    return hour === min || hour === max ? { hours: s.filter((h) => h !== hour) } : { hours: s, error: RELEASE_END_MSG };
  }
  if (hour === min - 1) return { hours: [hour, ...s] };
  if (hour === max + 1) return { hours: [...s, hour] };
  return { hours: s, error: STRICT_NOT_CONTIGUOUS_MSG };
}
