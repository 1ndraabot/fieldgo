import type { CourtDetail } from "./court-detail";
import { dayIndex, isWeekend, wibNow } from "./datetime";
import { getBlackouts, getOccupancy, type Blackout, type Occupancy } from "./mock-availability";

export type SlotStatus = "tersedia" | "terisi" | "ditahan" | "tidak-tersedia";
export type SlotInfo = { hour: number; status: SlotStatus; price: number | null; past?: boolean };
/** Data ketersediaan satu tanggal dari sumber (basis data). Bila kosong, dipakai data contoh. */
export type DayAvailability = { occupancy: Record<number, Occupancy>; blackouts: Blackout[] };

export const FIRST_HOUR = 6;
export const LAST_HOUR = 23; // slot terakhir 23.00–24.00
/** Batas navigasi tanggal ke depan (minggu) pada kalender. */
export const MAX_WEEKS_AHEAD = 8;
export const SLOT_COUNT = LAST_HOUR - FIRST_HOUR + 1; // 18

/** Harga per jam yang menutupi jam tersebut, atau null bila tidak ada tarif. */
export function tariffFor(court: CourtDetail, dateISO: string, hour: number): number | null {
  const tipe = isWeekend(dateISO) ? "weekend" : "weekday";
  const t = court.tariffs.find((x) => x.tipe === tipe && hour >= x.mulai && hour < x.selesai);
  return t ? t.harga : null;
}

/**
 * Status 18 slot pada satu tanggal. Urutan pengecekan mengikuti PRD Bagian 6:
 * 1 nonaktif/tutup/di luar jam → 2 tanpa tarif → 3 blacklist → 4 lampau →
 * 5 terisi → 6 ditahan sementara → 7 tersedia.
 */
export function computeSlots(court: CourtDetail, dateISO: string, nowMs: number, avail?: DayAvailability): SlotInfo[] {
  const now = wibNow(nowMs);
  const day = court.hours[dayIndex(dateISO)];
  const occupancy = avail ? avail.occupancy : getOccupancy(court.id, dateISO);
  const blackouts = avail ? avail.blackouts : getBlackouts(court.id, now.dateISO);

  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const hour = FIRST_HOUR + i;
    const price = tariffFor(court, dateISO, hour);
    const isPast = dateISO < now.dateISO || (dateISO === now.dateISO && hour * 60 <= now.minutes);
    const make = (status: SlotStatus): SlotInfo => ({ hour, status, price, ...(isPast ? { past: true } : {}) });

    if (!court.active || !day.open || hour < day.buka || hour >= day.tutup) return make("tidak-tersedia");
    if (price === null) return make("tidak-tersedia");
    const blocked = blackouts.some(
      (b) =>
        dateISO >= b.from && dateISO <= b.to &&
        (b.fromHour === undefined || b.toHour === undefined || (hour >= b.fromHour && hour < b.toHour)),
    );
    if (blocked) return make("tidak-tersedia");
    if (isPast) return make("tidak-tersedia");
    const occ = occupancy[hour];
    if (occ === "terisi") return make("terisi");
    if (occ === "ditahan") return make("ditahan");
    return make("tersedia");
  });
}

export const isBookable = (slots: SlotInfo[], hour: number) =>
  slots.some((s) => s.hour === hour && s.status === "tersedia");
