import { addDays } from "./datetime";

/**
 * PENGGANTI SEMENTARA untuk query basis data (SlotPesanan aktif + BlokirJadwal).
 * Hanya mengembalikan status — tidak ada data pemilik pesanan (PRD Bagian 6).
 */
export type Occupancy = "terisi" | "ditahan";
export type Blackout = { from: string; to: string; fromHour?: number; toHour?: number };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Jam mulai (6–23) → status dari pesanan aktif pada tanggal tersebut. */
export function getOccupancy(courtId: string, dateISO: string): Record<number, Occupancy> {
  const out: Record<number, Occupancy> = {};
  for (let h = 6; h <= 23; h++) {
    const v = hash(`${courtId}|${dateISO}|${h}`) % 100;
    if (v < 16) out[h] = "terisi";
    else if (v < 22) out[h] = "ditahan";
  }
  return out;
}

/** Blacklist jadwal (sehari penuh bila fromHour/toHour kosong). */
export function getBlackouts(courtId: string, todayISO: string): Blackout[] {
  if (courtId === "futsal-arena-a") return [{ from: addDays(todayISO, 3), to: addDays(todayISO, 3), fromHour: 12, toHour: 15 }];
  if (courtId === "mini-soccer") return [{ from: addDays(todayISO, 5), to: addDays(todayISO, 6) }];
  return [];
}
