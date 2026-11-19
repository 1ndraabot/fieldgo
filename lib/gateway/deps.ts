import { bacaPengaturan } from '../admin/pengaturan/data.ts';
import { auth } from '../auth/deps.ts';
import { buatLimiter } from '../auth/ratelimit.ts';
import { buatHandlersGateway } from './handlers.ts';
import { pilihGateway } from './index.ts';
import { prismaGatewayStore } from './prisma-store.ts';

export const handlersGateway = buatHandlersGateway({
  store: prismaGatewayStore,
  gateway: pilihGateway(),
  sekarang: () => new Date(),
  baseUrl: process.env.APP_URL ?? 'http://localhost:3000',
  auth,
  limiter: buatLimiter({ maks: 10, jendelaMs: 60_000 }), // 10 percobaan bayar / menit / pengguna
  gatewayAktif: async () => (await bacaPengaturan()).gatewayAktif,
  metodeAktif: async () => (await bacaPengaturan()).metodeAktif,
});
