/**
 * Aturan Admin — Kelola Tarif (FR-ADM-03), FRONTEND SAJA. Murni dan dapat diuji.
 * Tarif per lapangan, per tipe hari (weekday/weekend), per rentang jam [mulai, selesai). Jam 6–24.
 */
import type { DayHours, DayType, Tariff } from "./court-detail";

export type { DayType } from "./court-detail";

export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 24;
export const HOURS = CLOSE_HOUR - OPEN_HOUR; // 18 slot

export const DAY_TYPES: { type: DayType; title: string; sub: string }[] = [
  { type: "weekday", title: "Hari kerja", sub: "Senin sampai Jumat" },
  { type: "weekend", title: "Akhir pekan", sub: "Sabtu dan Minggu" },
];

/** Baris isian: nilai berupa teks agar bisa kosong/sedang diketik. */
export type TariffRow = { key: string; start: string; end: string; price: string };
export type CourtTariffs = Record<DayType, TariffRow[]>;

export const MESSAGES = {
  incomplete: "Isi jam mulai, jam selesai, dan harga.",
  integer: "Jam dan harga harus berupa bilangan bulat.",
  range: "Jam mulai harus lebih awal dari jam selesai, dalam rentang 06.00 sampai 24.00.",
  price: "Harga harus lebih besar dari 0.",
} as const;

export const hh = (h: number) => `${String(h).padStart(2, "0")}.00`;
export const rangeText = (s: number, e: number) => `${hh(s)}–${hh(e)}`;

let counter = 0;
export const newKey = () => `row-${++counter}`;

export function rowsFromTariffs(tariffs: Tariff[], tipe: DayType): TariffRow[] {
  return tariffs
    .filter((t) => t.tipe === tipe)
    .sort((a, b) => a.mulai - b.mulai)
    // kunci awal deterministik (sama di server dan klien → aman untuk hydration); baris baru memakai newKey()
    .map((t, i) => ({ key: `init-${tipe}-${i}`, start: String(t.mulai), end: String(t.selesai), price: String(t.harga) }));
}

export const courtTariffsFrom = (tariffs: Tariff[]): CourtTariffs => ({
  weekday: rowsFromTariffs(tariffs, "weekday"),
  weekend: rowsFromTariffs(tariffs, "weekend"),
});

/** Baris yang valid → angka. Dipakai setelah analisis tanpa galat. */
export function toTariffs(c: CourtTariffs): Tariff[] {
  const out: Tariff[] = [];
  for (const tipe of ["weekday", "weekend"] as const)
    for (const r of c[tipe]) out.push({ tipe, mulai: Number(r.start), selesai: Number(r.end), harga: Number(r.price) });
  return out.sort((a, b) => (a.tipe === b.tipe ? a.mulai - b.mulai : a.tipe === "weekday" ? -1 : 1));
}

const INT = /^\d+$/;
const parseInt10 = (s: string) => (INT.test(s.trim()) ? Number(s.trim()) : NaN);

type Parsed = { s: number; e: number; p: number };

/** Galat bentuk satu baris (tanpa melihat baris lain), atau hasil parse. */
function checkRow(r: TariffRow): { error: string } | { ok: Parsed } {
  if (r.start.trim() === "" || r.end.trim() === "" || r.price.trim() === "") return { error: MESSAGES.incomplete };
  const s = parseInt10(r.start), e = parseInt10(r.end), p = parseInt10(r.price);
  if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(p)) {
    // angka negatif / desimal: harga ≤ 0 dilaporkan sebagai galat harga bila jam sudah benar
    const ps = Number(r.price);
    if (Number.isFinite(ps) && ps <= 0 && !Number.isNaN(s) && !Number.isNaN(e)) return { error: MESSAGES.price };
    return { error: MESSAGES.integer };
  }
  if (s < OPEN_HOUR || e > CLOSE_HOUR || s >= e) return { error: MESSAGES.range };
  if (p <= 0) return { error: MESSAGES.price };
  return { ok: { s, e, p } };
}

export type Cell = "ok" | "gap" | "dup" | "off";
export type Analysis = {
  /** satu pesan galat per baris ("" = valid) */
  errors: string[];
  /** 18 sel: ok (ada tarif), gap (jam operasional tanpa tarif), dup (tumpang tindih), off (di luar jam operasional, tanpa tarif) */
  cells: Cell[];
  /** rentang jam operasional yang belum punya tarif: [mulai, selesai) */
  gaps: [number, number][];
  hasError: boolean;
};

/**
 * Analisis satu tipe hari: validasi tiap baris, deteksi tumpang tindih (batas yang bersinggungan, mis. 12.00 = 12.00, DIPERBOLEHKAN),
 * dan cakupan terhadap jam operasional (`required[i]` = jam 06+i harus bertarif).
 */
export function analyzeRows(rows: TariffRow[], required: boolean[]): Analysis {
  const checks = rows.map(checkRow);
  const errors = checks.map((c) => ("error" in c ? c.error : ""));

  // tumpang tindih antar baris valid: a.s < b.e && b.s < a.e
  checks.forEach((c, i) => {
    if (!("ok" in c)) return;
    const j = checks.findIndex((o, k) => k !== i && "ok" in o && c.ok.s < o.ok.e && o.ok.s < c.ok.e);
    if (j >= 0) {
      const o = (checks[j] as { ok: Parsed }).ok;
      errors[i] = `Rentang ini tumpang tindih dengan rentang ${j + 1} (${rangeText(o.s, o.e)}).`;
    }
  });

  const count = new Array(HOURS).fill(0);
  checks.forEach((c) => { if ("ok" in c) for (let h = c.ok.s; h < c.ok.e; h++) count[h - OPEN_HOUR]++; });

  const cells: Cell[] = count.map((n, i) => (n > 1 ? "dup" : n === 1 ? "ok" : required[i] ? "gap" : "off"));

  const gaps: [number, number][] = [];
  let st = -1;
  for (let i = 0; i <= HOURS; i++) {
    const gap = i < HOURS && cells[i] === "gap";
    if (gap && st < 0) st = i;
    if (!gap && st >= 0) { gaps.push([st + OPEN_HOUR, i + OPEN_HOUR]); st = -1; }
  }
  return { errors, cells, gaps, hasError: errors.some(Boolean) };
}

/** Jam yang wajib bertarif untuk satu tipe hari: gabungan jam buka hari-hari bertipe itu (Sen–Jum / Sab–Min). */
export function requiredHours(hours: DayHours[], tipe: DayType): boolean[] {
  const days = tipe === "weekday" ? [0, 1, 2, 3, 4] : [5, 6];
  return Array.from({ length: HOURS }, (_, i) => {
    const h = OPEN_HOUR + i;
    return days.some((d) => hours[d]?.open && h >= hours[d].buka && h < hours[d].tutup);
  });
}

export const gapMessage = (gaps: [number, number][]) =>
  gaps.length === 0
    ? ""
    : `Jam ${gaps.map(([s, e]) => `${hh(s)} sampai ${hh(e)}`).join(", ")} belum punya tarif. Slot di jam itu tidak bisa dipesan.`;

export type CourtAnalysis = Record<DayType, Analysis> & { hasError: boolean; hasGap: boolean };

export function analyzeCourt(c: CourtTariffs, hours: DayHours[]): CourtAnalysis {
  const weekday = analyzeRows(c.weekday, requiredHours(hours, "weekday"));
  const weekend = analyzeRows(c.weekend, requiredHours(hours, "weekend"));
  return { weekday, weekend, hasError: weekday.hasError || weekend.hasError, hasGap: weekday.gaps.length > 0 || weekend.gaps.length > 0 };
}

/** Harga per jam untuk pesanan BARU pada tipe hari dan jam tertentu (null = tanpa tarif). Pesanan lama memakai harga terkunci. */
export function priceFor(tariffs: Tariff[], tipe: DayType, hour: number): number | null {
  return tariffs.find((t) => t.tipe === tipe && hour >= t.mulai && hour < t.selesai)?.harga ?? null;
}

export const sameTariffs = (a: CourtTariffs, b: CourtTariffs) =>
  JSON.stringify(toRaw(a)) === JSON.stringify(toRaw(b));
const toRaw = (c: CourtTariffs) => (["weekday", "weekend"] as const).map((t) => c[t].map((r) => [r.start, r.end, r.price]));

/** Baris baru: mulai tepat setelah rentang terakhir (atau 06), 1 jam, harga disalin dari baris terakhir. */
export function newRow(rows: TariffRow[]): TariffRow {
  const last = rows[rows.length - 1];
  const lastEnd = last ? Number(last.end) : NaN;
  const start = Number.isInteger(lastEnd) && lastEnd < CLOSE_HOUR && lastEnd >= OPEN_HOUR ? lastEnd : OPEN_HOUR;
  return { key: newKey(), start: String(start), end: String(Math.min(CLOSE_HOUR, start + 1)), price: last?.price || "100000" };
}
