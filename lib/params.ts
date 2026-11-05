import { z } from 'zod';

const Tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s); // tolak 2026-02-31
const Olahraga = z.string().trim().min(1).max(50);

type Raw = string | string[] | undefined;
const first = (v: Raw) => (Array.isArray(v) ? v[0] : v);

/** Query string tidak dipercaya: nilai tidak valid jatuh ke default (tanggal lampau → hari ini). */
export function parseBerandaParams(raw: { olahraga?: Raw; tanggal?: Raw }, hariIni: string) {
  const o = Olahraga.safeParse(first(raw.olahraga));
  const t = Tanggal.safeParse(first(raw.tanggal));
  return {
    olahraga: o.success ? o.data : null,
    tanggal: t.success && t.data >= hariIni ? t.data : hariIni,
  };
}
