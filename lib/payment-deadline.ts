import { hourLabel, shortLabel, wibNow } from "./datetime";

const pad = (n: number) => String(n).padStart(2, "0");

/** Waktu mulai main (epoch ms) untuk tanggal WIB dan jam mulai. WIB = UTC+7 tetap (tanpa DST). */
export const playStartMs = (dateISO: string, hour: number) => Date.parse(`${dateISO}T${pad(hour)}:00:00+07:00`);

/** PRD 5.3: batas_bayar_pada = minimum(waktu dibuat + batas jam, jam mulai main). */
export function paymentDeadlineMs(createdMs: number, dateISO: string, firstHour: number, limitHours = 24): number {
  return Math.min(createdMs + limitHours * 3_600_000, playStartMs(dateISO, firstHour));
}

/** "Sab, 7 Nov · 20.00 WIB" */
export function formatDeadline(ms: number): string {
  const w = wibNow(ms);
  return `${shortLabel(w.dateISO)} · ${hourLabel(Math.floor(w.minutes / 60)).slice(0, 2)}.${pad(w.minutes % 60)} WIB`;
}
