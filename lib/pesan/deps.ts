import { auth } from '../auth/deps.ts';
import { buatLimiter } from '../auth/ratelimit.ts';
import { bacaPengaturan } from '../admin/pengaturan/data.ts';
import { buatHandlersPesan } from './handlers.ts';
import { prismaPesanStore } from './prisma-store.ts';
import { PesanSchema } from './schema.ts';

export const handlersPesan = buatHandlersPesan({
  store: prismaPesanStore,
  sekarang: () => new Date(),
  batasBayarJam: async () => (await bacaPengaturan()).batasBayarJam,
  auth,
  skema: PesanSchema,
  limiter: { pesan: buatLimiter({ maks: 10, jendelaMs: 10 * 60_000 }) }, // 10 percobaan / 10 menit per pengguna
});
