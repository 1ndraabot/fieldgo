import { COURTS } from "./data";
import { getCourtDetail, type DayHours } from "./court-detail";
import { buildVerificationData } from "./mock-verification";

/**
 * DATA CONTOH Admin — Kelola Jam Operasional (frontend saja), diturunkan dari data lapangan yang sama dengan halaman
 * publik dan Admin Tarif. Ganti dengan data backend (JamOperasional per lapangan per hari + jumlah pesanan aktif).
 */
export type HoursCourt = { id: string; name: string; sport: string; hours: DayHours[] };
export type HoursData = { courts: HoursCourt[]; activeOrders: Record<string, number> };

export function buildHoursData(nowMs: number): HoursData {
  const courts: HoursCourt[] = COURTS.map((c) => {
    const d = getCourtDetail(c.id)!;
    return { id: d.id, name: d.name, sport: d.sport, hours: d.hours.map((h) => ({ ...h })) };
  });
  const v = buildVerificationData(nowMs);
  const activeOrders: Record<string, number> = {};
  for (const o of [...v.payments, ...v.cancellations]) activeOrders[o.courtId] = (activeOrders[o.courtId] ?? 0) + 1;
  return { courts, activeOrders };
}
