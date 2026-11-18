import { buatHandlers } from './handlers.ts';
import { pilihMailer } from './mailer.ts';
import { prismaStore } from './prisma-store.ts';
import { buatLimiter } from './ratelimit.ts';
import { DaftarSchema, LupaSchema, MasukSchema, ResetSchema } from './schema.ts';
import type { AuthDeps } from './service.ts';

const produksi = process.env.NODE_ENV === 'production';

export const auth: AuthDeps = {
  store: prismaStore,
  mailer: pilihMailer, // Resend jika RESEND_API_KEY+MAIL_DARI diset, konsol jika tidak
  sekarang: () => new Date(),
  baseUrl: process.env.APP_URL ?? 'http://localhost:3000',
};

export const handlers = buatHandlers({
  ...auth,
  secure: produksi,
  skema: { daftar: DaftarSchema, masuk: MasukSchema, lupa: LupaSchema, reset: ResetSchema },
  limiter: {
    masuk: buatLimiter({ maks: 5, jendelaMs: 10 * 60_000 }), // 5 percobaan / 10 menit per IP+email
    daftar: buatLimiter({ maks: 5, jendelaMs: 15 * 60_000 }), // 5 pendaftaran / 15 menit per IP
    kirimUlang: buatLimiter({ maks: 1, jendelaMs: 60_000 }), // 1 kali / 60 detik per pengguna (sesuai desain)
    lupaSandi: buatLimiter({ maks: 3, jendelaMs: 15 * 60_000 }), // 3 permintaan tautan / 15 menit per IP
    resetSandi: buatLimiter({ maks: 5, jendelaMs: 10 * 60_000 }), // 5 percobaan / 10 menit per IP
  },
});
