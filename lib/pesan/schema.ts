import { z } from 'zod';
import type { PesanInput } from './rules.ts';

// Tipe dasar saja; aturan bisnis (jam, tanggal, tarif) diperiksa service dengan data lapangan.
export const PesanSchema = z.object({
  lapanganId: z.number().int().positive(),
  tanggal: z.string(),
  mulai: z.number().int(),
  selesai: z.number().int(),
});

export type { PesanInput };
