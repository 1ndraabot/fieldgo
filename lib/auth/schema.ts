import { z } from 'zod';
import { validasiDaftar, validasiMasuk } from './rules.ts';

// Zod hanya membungkus parse/tipe; aturan sebenarnya ada di rules.ts (dipakai juga oleh form di browser).
const terapkan = <T extends Record<string, unknown>>(aturan: (i: T) => Record<string, string>) =>
  (v: T, ctx: z.RefinementCtx) => {
    for (const [k, message] of Object.entries(aturan(v))) ctx.addIssue({ code: 'custom', path: [k], message });
  };

export const DaftarSchema = z
  .object({ nama: z.string(), email: z.string(), nomorKontak: z.string(), kataSandi: z.string(), setuju: z.boolean() })
  .superRefine(terapkan(validasiDaftar));

export const MasukSchema = z
  .object({ email: z.string(), kataSandi: z.string() })
  .superRefine(terapkan(validasiMasuk));
