/**
 * Pengaturan Global Admin (FR-ADM-10), FRONTEND SAJA. Murni dan dapat diuji.
 * Hanya tiga hal sesuai PRD: rekening tujuan, batas bayar (jam), batas pembatalan (hari).
 */
export type SettingsForm = {
  bank: string;
  rek: string;
  an: string;
  /** jam — teks agar bisa kosong/sedang diketik */
  bayar: string;
  /** hari sebelum tanggal main */
  batal: string;
};
export type SettingsErrors = Partial<Record<keyof SettingsForm, string>>;

/** Nilai awal sesuai PRD: batas bayar 24 jam, batas pembatalan 1 hari (H-1). */
export const DEFAULT_PAYMENT_HOURS = 24;
export const DEFAULT_CANCEL_DAYS = 1;

/** Batas atas dari desain referensi (PRD hanya mewajibkan angka positif). */
export const MAX_PAYMENT_HOURS = 72;
export const MAX_CANCEL_DAYS = 14;

export const MESSAGES = {
  bank: "Nama bank wajib diisi.",
  rekEmpty: "Nomor rekening wajib diisi.",
  rekDigits: "Nomor rekening hanya boleh berisi angka, tanpa spasi atau tanda hubung.",
  rekLength: "Nomor rekening harus 6 sampai 20 digit.",
  an: "Nama pemilik rekening wajib diisi.",
  bayarEmpty: "Batas pembayaran wajib diisi.",
  bayarInt: `Isi bilangan bulat, contoh: ${DEFAULT_PAYMENT_HOURS}.`,
  bayarPositive: "Batas pembayaran harus angka positif (minimal 1 jam).",
  bayarMax: `Batas pembayaran maksimal ${MAX_PAYMENT_HOURS} jam.`,
  batalEmpty: "Batas pembatalan wajib diisi.",
  batalInt: `Isi bilangan bulat, contoh: ${DEFAULT_CANCEL_DAYS}.`,
  batalPositive: "Batas pembatalan harus angka positif (minimal 1 hari).",
  batalMax: `Batas pembatalan maksimal ${MAX_CANCEL_DAYS} hari.`,
} as const;

/** Angka bulat positif dari teks: galat, atau nilai. */
function parsePositive(raw: string, kind: "bayar" | "batal", max: number): { error: string } | { value: number } {
  const t = raw.trim();
  const m = MESSAGES;
  if (t === "") return { error: kind === "bayar" ? m.bayarEmpty : m.batalEmpty };
  const n = Number(t);
  if (!Number.isFinite(n) || !/^[+-]?\d+(\.\d+)?$/.test(t) || !Number.isInteger(n)) return { error: kind === "bayar" ? m.bayarInt : m.batalInt };
  if (n < 1) return { error: kind === "bayar" ? m.bayarPositive : m.batalPositive };
  if (n > max) return { error: kind === "bayar" ? m.bayarMax : m.batalMax };
  return { value: n };
}

export function validateSettings(s: SettingsForm): SettingsErrors {
  const e: SettingsErrors = {};
  if (!s.bank.trim()) e.bank = MESSAGES.bank;
  const rek = s.rek.trim();
  if (rek === "") e.rek = MESSAGES.rekEmpty;
  else if (!/^\d+$/.test(rek)) e.rek = MESSAGES.rekDigits;
  else if (rek.length < 6 || rek.length > 20) e.rek = MESSAGES.rekLength;
  if (!s.an.trim()) e.an = MESSAGES.an;
  const b = parsePositive(s.bayar, "bayar", MAX_PAYMENT_HOURS); if ("error" in b) e.bayar = b.error;
  const c = parsePositive(s.batal, "batal", MAX_CANCEL_DAYS); if ("error" in c) e.batal = c.error;
  return e;
}

/** Rapikan sebelum disimpan: trim teks, rapikan spasi ganda, angka tanpa nol di depan. */
export function normalizeSettings(s: SettingsForm): SettingsForm {
  const tidy = (x: string) => x.trim().replace(/\s+/g, " ");
  return { bank: tidy(s.bank), rek: s.rek.trim(), an: tidy(s.an), bayar: String(Number(s.bayar.trim())), batal: String(Number(s.batal.trim())) };
}

export const sameSettings = (a: SettingsForm, b: SettingsForm) =>
  a.bank.trim() === b.bank.trim() && a.rek.trim() === b.rek.trim() && a.an.trim() === b.an.trim() &&
  a.bayar.trim() === b.bayar.trim() && a.batal.trim() === b.batal.trim();

export const hoursText = (v: string | number) => `${v} jam`;
/** "H-1" (1 hari sebelum tanggal main) */
export const cancelText = (v: string | number) => `H-${v}`;

/** "8830123456" → "8830 123 456" (tampilan saja; nilai tersimpan tanpa spasi) */
export const groupAccount = (n: string) => n.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

/** Perubahan yang akan disimpan, untuk dialog konfirmasi. */
export function describeChanges(before: SettingsForm, after: SettingsForm): string[] {
  const out: string[] = [];
  const b = normalizeSettings(before), a = normalizeSettings(after);
  if (b.bank !== a.bank) out.push(`Nama bank: ${b.bank} → ${a.bank}`);
  if (b.rek !== a.rek) out.push(`Nomor rekening: ${groupAccount(b.rek)} → ${groupAccount(a.rek)}`);
  if (b.an !== a.an) out.push(`Atas nama: ${b.an} → ${a.an}`);
  if (b.bayar !== a.bayar) out.push(`Batas pembayaran: ${hoursText(b.bayar)} → ${hoursText(a.bayar)}`);
  if (b.batal !== a.batal) out.push(`Batas pembatalan: ${cancelText(b.batal)} → ${cancelText(a.batal)}`);
  return out;
}

/** Perubahan rekening perlu perhatian ekstra: penyewa akan mentransfer ke rekening ini. */
export const accountChanged = (before: SettingsForm, after: SettingsForm) =>
  describeChanges(before, after).some((l) => l.startsWith("Nama bank") || l.startsWith("Nomor rekening") || l.startsWith("Atas nama"));
