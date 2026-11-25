import { z } from 'zod';
import type { AjuanInput } from './rules.ts';

// Bentuk dasar; aturan bisnis (H-1, status, kepemilikan) diperiksa service dengan data pesanan.
export const AjuanSchema = z.object({
  alasan: z.string().trim().min(10).max(1000),
  namaBank: z.string().trim().min(1).max(40),
  nomorRekening: z.string().trim().min(5).max(30),
  atasNama: z.string().trim().min(1).max(120),
});

export type { AjuanInput };
