import { DAY_NAMES, MONTHS_SHORT, dayIndex, dayOfMonth, wibNow } from "./datetime";

const pad = (n: number) => String(n).padStart(2, "0");

export const formatHMS = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const remainingSeconds = (deadlineMs: number, nowMs: number) => Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));

const monthYear = (iso: string) => `${MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** "Sabtu, 7 Nov 2026" */
export const dateLong = (iso: string) => `${DAY_NAMES[dayIndex(iso)]}, ${dayOfMonth(iso)} ${monthYear(iso)}`;

/** "Kamis, 5 Nov 2026 · 12.00 WIB" */
export function deadlineLong(ms: number): string {
  const w = wibNow(ms);
  return `${dateLong(w.dateISO)} · ${pad(Math.floor(w.minutes / 60))}.${pad(w.minutes % 60)} WIB`;
}

/** "4 Nov 2026, 12.00 WIB" */
export function createdLabel(ms: number): string {
  const w = wibNow(ms);
  return `${dayOfMonth(w.dateISO)} ${monthYear(w.dateISO)}, ${pad(Math.floor(w.minutes / 60))}.${pad(w.minutes % 60)} WIB`;
}
