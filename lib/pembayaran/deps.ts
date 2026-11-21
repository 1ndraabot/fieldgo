import { auth } from '../auth/deps.ts';
import { buatLimiter } from '../auth/ratelimit.ts';
import { buatStorage } from '../storage.ts';
import { buatHandlersPembayaran } from './handlers.ts';
import { prismaPembayaranStore } from './prisma-store.ts';
import type { PembayaranDeps, Storage } from './service.ts';

// Dibuat saat pertama kali dipakai: `next build` tidak boleh gagal hanya karena env storage belum diisi.
let storage: Storage | undefined;
const ambilStorage = () => (storage ??= buatStorage());
const storageLazy: Storage = {
  simpan: (k, isi, tipe) => ambilStorage().simpan(k, isi, tipe),
  hapus: (k) => ambilStorage().hapus(k),
};

export const pembayaranDeps: PembayaranDeps = { store: prismaPembayaranStore, storage: storageLazy, sekarang: () => new Date() };

export const handlersPembayaran = buatHandlersPembayaran({
  ...pembayaranDeps,
  auth,
  limiter: { unggah: buatLimiter({ maks: 5, jendelaMs: 10 * 60_000 }) }, // 5 percobaan / 10 menit per pengguna
});
