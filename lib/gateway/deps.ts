import { bacaPengaturan } from '../admin/pengaturan/data.ts';
import { auth } from '../auth/deps.ts';
import { buatLimiter } from '../auth/ratelimit.ts';
import { buatHandlersGateway } from './handlers.ts';
import { pilihGateway } from './index.ts';
import { peringatanEnvProduksi } from './rules.ts';
import { prismaGatewayStore } from './prisma-store.ts';

// Salah konfigurasi di produksi baru terasa saat pembayaran; peringatkan sejak server menyala.
if (process.env.NODE_ENV === 'production') {
  for (const pesan of peringatanEnvProduksi({
    provider: (process.env.GATEWAY_PROVIDER ?? 'xendit').toLowerCase(),
    secretKey: process.env.XENDIT_SECRET_KEY,
    callbackToken: process.env.XENDIT_CALLBACK_TOKEN,
    appUrl: process.env.APP_URL,
  })) console.warn(`[gateway] ${pesan}`);
}

export const handlersGateway = buatHandlersGateway({
  store: prismaGatewayStore,
  gateway: pilihGateway(),
  sekarang: () => new Date(),
  baseUrl: process.env.APP_URL ?? 'http://localhost:3000',
  auth,
  limiter: buatLimiter({ maks: 10, jendelaMs: 60_000 }), // 10 percobaan bayar / menit / pengguna
  throttleSinkron: buatLimiter({ maks: 1, jendelaMs: 10_000 }).cek, // 1 tarikan status / 10 detik / pesanan
  gatewayAktif: async () => (await bacaPengaturan()).gatewayAktif,
  metodeAktif: async () => (await bacaPengaturan()).metodeAktif,
});
