export type BatasLaju = { diizinkan: boolean; ulangiDetik: number };

/**
 * Jendela geser, disimpan di memori proses ini.
 * shortcut: PRD meminta Redis; in-memory hanya efektif untuk satu instance. Ganti isi fungsi ini saat Redis tersedia.
 */
export function buatLimiter({ maks, jendelaMs, sekarang = Date.now }: { maks: number; jendelaMs: number; sekarang?: () => number }) {
  const hit = new Map<string, number[]>();
  return {
    cek(kunci: string): BatasLaju {
      const t = sekarang();
      const aktif = (hit.get(kunci) ?? []).filter((x) => t - x < jendelaMs);
      if (aktif.length >= maks) {
        hit.set(kunci, aktif);
        return { diizinkan: false, ulangiDetik: Math.ceil((aktif[0] + jendelaMs - t) / 1000) };
      }
      hit.set(kunci, [...aktif, t]);
      return { diizinkan: true, ulangiDetik: 0 };
    },
    reset(kunci: string) { hit.delete(kunci); },
  };
}
export type Limiter = ReturnType<typeof buatLimiter>;
