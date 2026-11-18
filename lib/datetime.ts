/** Semua perhitungan waktu memakai WIB (Asia/Jakarta) — PRD 10.4. */
export const TZ = "Asia/Jakarta";

export const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
export const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Tanggal (YYYY-MM-DD) dan menit-sejak-tengah-malam saat ini di WIB. */
export function wibNow(ms: number) {
  const p: Record<string, string> = {};
  for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
  return { dateISO: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const ymd = (iso: string) => iso.split("-").map(Number) as [number, number, number];

export function addDays(iso: string, n: number): string {
  const [y, m, d] = ymd(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const [a, b, c] = ymd(from);
  const [x, y, z] = ymd(to);
  return Math.round((Date.UTC(x, y - 1, z) - Date.UTC(a, b - 1, c)) / 86400000);
}

/** 0 = Senin … 6 = Minggu */
export function dayIndex(iso: string): number {
  const [y, m, d] = ymd(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export const isWeekend = (iso: string) => dayIndex(iso) >= 5;
export const dayOfMonth = (iso: string) => ymd(iso)[2];
export const shortLabel = (iso: string) => `${DAY_SHORT[dayIndex(iso)]}, ${ymd(iso)[2]} ${MONTHS_SHORT[ymd(iso)[1] - 1]}`;
export const longLabel = (iso: string) => `${DAY_NAMES[dayIndex(iso)]}, ${ymd(iso)[2]} ${MONTHS[ymd(iso)[1] - 1]}`;
export const monthYear = (iso: string) => `${MONTHS[ymd(iso)[1] - 1]} ${ymd(iso)[0]}`;

export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}.00`;
export const rangeLabel = (from: number, toExclusive: number) => `${hourLabel(from)}–${hourLabel(toExclusive)}`;
