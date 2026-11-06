import { buatHandlers } from './handlers.ts';
import { mailerKonsol } from './mailer.ts';
import { prismaStore } from './prisma-store.ts';
import { buatLimiter } from './ratelimit.ts';
import { DaftarSchema, MasukSchema } from './schema.ts';
import type { AuthDeps } from './service.ts';

const produksi = process.env.NODE_ENV === 'production';

export const auth: AuthDeps = {
  store: prismaStore,
  mailer: mailerKonsol,
  sekarang: () => new Date(),
  baseUrl: process.env.APP_URL ?? 'http://localhost:3000',
};

export const handlers = buatHandlers({
  ...auth,
  secure: produksi,
  skema: { daftar: DaftarSchema, masuk: MasukSchema },
  limiter: {
    masuk: buatLimiter({ maks: 5, jendelaMs: 10 * 60_000 }), // 5 percobaan / 10 menit per IP+email
    daftar: buatLimiter({ maks: 5, jendelaMs: 15 * 60_000 }), // 5 pendaftaran / 15 menit per IP
    kirimUlang: buatLimiter({ maks: 1, jendelaMs: 60_000 }), // 1 kali / 60 detik per pengguna (sesuai desain)
  },
});
