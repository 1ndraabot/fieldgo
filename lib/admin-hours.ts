/**
 * Aturan Admin — Kelola Jam Operasional (FR-ADM-04), FRONTEND SAJA. Murni dan dapat diuji.
 * Satu baris per lapangan per hari (Senin–Minggu): jam buka, jam tutup (6–24), dan status buka/tutup.
 */
import type { DayHours } from "./court-detail";
import { DAY_NAMES, hourLabel } from "./datetime";

export const MIN_OPEN = 6;
export const MAX_CLOSE = 24;
export const SPAN = MAX_CLOSE - MIN_OPEN; // 18

export const STANDARD_DAY: DayHours = { buka: MIN_OPEN, tutup: MAX_CLOSE, open: true };
/** Standar awal: 06.00–24.00 setiap hari. */
export const standardWeek = (): DayHours[] => Array.from({ length: 7 }, () => ({ ...STANDARD_DAY }));
export const cloneWeek = (w: DayHours[]): DayHours[] => w.map((d) => ({ ...d }));

export const MESSAGES = {
  order: "Jam buka harus lebih awal dari jam tutup.",
  range: "Jam harus berada dalam rentang 06.00 sampai 24.00.",
  allClosed: "Semua hari ditandai tutup, jadi lapangan ini tidak bisa dipesan sama sekali.",
} as const;

/** Galat satu hari, atau null. Hari tutup tidak divalidasi (jam diabaikan). */
export function validateDay(d: DayHours): string | null {
  if (!d.open) return null;
  if (!Number.isInteger(d.buka) || !Number.isInteger(d.tutup) || d.buka < MIN_OPEN || d.tutup > MAX_CLOSE) return MESSAGES.range;
  return d.buka >= d.tutup ? MESSAGES.order : null;
}

export const validateWeek = (w: DayHours[]) => w.map(validateDay);
export const hasErrors = (w: DayHours[]) => validateWeek(w).some(Boolean);
export const allClosed = (w: DayHours[]) => w.every((d) => !d.open);

/** Salin jam (dan status) Senin ke semua hari. */
export const applyMondayToAll = (w: DayHours[]): DayHours[] => w.map(() => ({ ...w[0] }));

const dayEqual = (a: DayHours, b: DayHours) => (!a.open && !b.open) || (a.open === b.open && a.buka === b.buka && a.tutup === b.tutup);
export const sameWeek = (a: DayHours[], b: DayHours[]) => a.every((d, i) => dayEqual(d, b[i]));

const range = (d: DayHours) => `${hourLabel(d.buka)}–${hourLabel(d.tutup)}`;
const label = (d: DayHours) => (d.open ? range(d) : "tutup");

/** Ringkasan, hari berurutan dengan jam sama digabung: "Senin–Jumat 06.00–24.00 · Sabtu 06.00–22.00 · Minggu tutup". */
export function summarize(w: DayHours[]): string {
  if (allClosed(w)) return "Tutup setiap hari";
  if (w.every((d) => dayEqual(d, w[0]))) return `Setiap hari ${label(w[0])}`;
  const parts: string[] = [];
  let i = 0;
  while (i < w.length) {
    let j = i;
    while (j + 1 < w.length && dayEqual(w[j + 1], w[i])) j++;
    parts.push(`${i === j ? DAY_NAMES[i] : `${DAY_NAMES[i]}–${DAY_NAMES[j]}`} ${label(w[i])}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

/** Perubahan per hari: "Sabtu: 06.00–24.00 → 08.00–22.00". */
export function describeChanges(before: DayHours[], after: DayHours[]): string[] {
  return after.flatMap((a, i) => (dayEqual(before[i], a) ? [] : [`${DAY_NAMES[i]}: ${label(before[i])} → ${label(a)}`]));
}

/** Menyempit = ada hari yang tadinya buka lalu ditutup, atau jam bukanya dikurangi. Pesanan yang ada tidak dibatalkan otomatis. */
export const isNarrowing = (before: DayHours[], after: DayHours[]) =>
  before.some((b, i) => b.open && (!after[i].open || after[i].buka > b.buka || after[i].tutup < b.tutup));

/** Posisi bilah rentang dalam skala 06–24 (persen); null bila tutup/tidak valid. */
export function barPercent(d: DayHours): { left: number; width: number } | null {
  if (!d.open || validateDay(d)) return null;
  return { left: ((d.buka - MIN_OPEN) / SPAN) * 100, width: ((d.tutup - d.buka) / SPAN) * 100 };
}

/** Simpan satu lapangan; lapangan lain tidak disentuh (referensi sama). */
export function saveWeek(all: Record<string, DayHours[]>, courtId: string, week: DayHours[]): Record<string, DayHours[]> {
  return { ...all, [courtId]: cloneWeek(week) };
}
