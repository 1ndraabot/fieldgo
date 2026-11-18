import type { SlotInfo } from "./availability";
import type { BookingErrorCode } from "./booking-errors";

export type CourtOption = { id: string; name: string; sport: string };

export type SlotsResponse = { ok: true; lapangan: string; tanggal: string; slots: SlotInfo[] };

export type CreateOrderResponse =
  | { ok: true; kode: string; redirect: string }
  | { ok: false; code: BookingErrorCode; message: string };
