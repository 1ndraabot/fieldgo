import { auth } from '../auth/deps.ts';
import { buatLimiter } from '../auth/ratelimit.ts';
import { buatHandlersRiwayat } from './handlers.ts';
import { prismaRiwayatStore } from './prisma-store.ts';
import { AjuanSchema } from './schema.ts';

export const riwayatDeps = { store: prismaRiwayatStore, sekarang: () => new Date() };

export const handlersRiwayat = buatHandlersRiwayat({
  ...riwayatDeps,
  auth,
  skema: AjuanSchema,
  limiter: { ajuan: buatLimiter({ maks: 5, jendelaMs: 10 * 60_000 }) }, // 5 pengajuan / 10 menit per pengguna
});
