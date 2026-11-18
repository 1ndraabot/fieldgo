import { MAX_WEEKS_AHEAD, isBookable, type SlotInfo } from "../availability";
import type { CourtOption } from "../booking-types";
import { addDays, diffDays, wibNow } from "../datetime";
import { isContiguous } from "../selection";
import { getDaySlots, getSetting, listActiveCourts } from "./repo";

export type PesanInitial = {
  courts: CourtOption[]; courtId: string; date: string; slots: SlotInfo[]; hours: number[];
  note: string | null; fromQuery: boolean; batasBayarJam: number;
};

type Params = { lapangan?: string; tanggal?: string; jam?: string };

/** Pilihan dari halaman Detail (query) divalidasi ulang di server sebelum ditampilkan. */
export function loadPesanInitial(p: Params, nowMs: number): PesanInitial | null {
  const courts = listActiveCourts();
  if (courts.length === 0) return null;
  const today = wibNow(nowMs).dateISO;

  const courtId = courts.find((c) => c.id === p.lapangan)?.id ?? courts[0].id;
  let date = today;
  let note: string | null = null;
  if (p.tanggal) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(p.tanggal) && addDays(p.tanggal, 0) === p.tanggal
      && p.tanggal >= today && diffDays(today, p.tanggal) <= MAX_WEEKS_AHEAD * 7 - 1;
    if (ok) date = p.tanggal; else note = "Tanggal dari halaman sebelumnya tidak bisa dipesan. Pilih tanggal dan jam lagi.";
  }

  const slots = getDaySlots(courtId, date, nowMs) ?? [];
  let hours: number[] = [];
  if (p.jam && !note) {
    const parsed = p.jam.split(",").map(Number);
    const sane = parsed.length > 0 && parsed.length <= 18 && parsed.every((h) => Number.isInteger(h)) && new Set(parsed).size === parsed.length;
    if (sane && isContiguous(parsed) && parsed.every((h) => isBookable(slots, h))) hours = [...parsed].sort((a, b) => a - b);
    else note = "Pilihan jam dari halaman sebelumnya sudah tidak tersedia. Pilih ulang jam main.";
  }
  return { courts, courtId, date, slots, hours, note, fromQuery: Boolean(p.lapangan || p.tanggal || p.jam), batasBayarJam: getSetting("batas_bayar_jam", 24) };
}
