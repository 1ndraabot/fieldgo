import { COURTS } from "./data";
import { getCourtDetail, type DayHours, type Tariff } from "./court-detail";
import { buildVerificationData } from "./mock-verification";

/**
 * DATA CONTOH Admin — Kelola Tarif (frontend saja), diturunkan dari data lapangan yang sama dengan halaman publik.
 * Ganti dengan data backend (Lapangan, Tarif, JamOperasional, pesanan aktif).
 */
export type TariffCourt = { id: string; name: string; sport: string; hours: DayHours[]; tariffs: Tariff[] };
/** Pesanan yang sudah dibuat: harga dikunci saat dipesan (BR-06) dan TIDAK ikut berubah bila tarif diubah. */
export type LockedOrder = { kode: string; courtId: string; total: number };
export type TariffsData = { courts: TariffCourt[]; lockedOrders: LockedOrder[] };

export function buildTariffsData(nowMs: number): TariffsData {
  const courts: TariffCourt[] = COURTS.map((c) => {
    const d = getCourtDetail(c.id)!;
    return { id: d.id, name: d.name, sport: d.sport, hours: d.hours.map((h) => ({ ...h })), tariffs: d.tariffs.map((t) => ({ ...t })) };
  });
  const v = buildVerificationData(nowMs);
  const lockedOrders = [...v.payments, ...v.cancellations].map((o) => ({ kode: o.kode, courtId: o.courtId, total: o.total }));
  return { courts, lockedOrders };
}
