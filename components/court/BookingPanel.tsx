"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { MAX_WEEKS_AHEAD, computeSlots, isBookable, type DayAvailability } from "@/lib/availability";
import type { Blackout, Occupancy } from "@/lib/mock-availability";
import type { AuthStatus } from "@/lib/auth";
import { bookingHref, loadDraft, saveDraft } from "@/lib/booking-draft";
import type { CourtDetail } from "@/lib/court-detail";
import { addDays, diffDays, monthYear, wibNow } from "@/lib/datetime";
import { ROUTES } from "@/lib/routes";
import { buildBreakdown, isContiguous, toggleHour } from "@/lib/selection";
import BookingSummary from "./BookingSummary";
import DateStrip from "./DateStrip";
import SlotGrid from "./SlotGrid";
import SlotLegend from "./SlotLegend";

/** Ketersediaan dari basis data: status slot per tanggal (tanpa data pemilik pesanan). */
export type CourtAvailability = { occupancy: Record<string, Record<number, Occupancy>>; blackouts: Blackout[] };

type Props = { court: CourtDetail; nowMs: number; auth: AuthStatus; availability?: CourtAvailability };

export default function BookingPanel({ court, nowMs, auth, availability }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(nowMs);
  const today = wibNow(now).dateISO;

  const [weekOffset, setWeekOffset] = useState(0);
  const [pickedDate, setPickedDate] = useState(today);
  const [hours, setHours] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needVerify, setNeedVerify] = useState(false);

  // jika hari berganti saat halaman terbuka, jangan biarkan tanggal lampau terpilih
  const dateISO = pickedDate < today ? today : pickedDate;
  const stripStart = addDays(today, weekOffset * 7);

  const availFor = (d: string): DayAvailability | undefined =>
    availability ? { occupancy: availability.occupancy[d] ?? {}, blackouts: availability.blackouts } : undefined;

  const slots = useMemo(
    () => computeSlots(court, dateISO, now, availability ? { occupancy: availability.occupancy[dateISO] ?? {}, blackouts: availability.blackouts } : undefined),
    [court, dateISO, now, availability],
  );
  const { rows, total } = useMemo(() => buildBreakdown(slots, hours), [slots, hours]);

  // perbarui status slot tiap menit (slot lampau, pesanan baru)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // lepas jam terpilih yang sudah tidak bisa dipesan
  useEffect(() => {
    if (hours.length && !hours.every((h) => isBookable(slots, h))) {
      setHours((prev) => prev.filter((h) => isBookable(slots, h)));
      setError("Sebagian jam yang kamu pilih sudah tidak tersedia. Periksa pilihanmu.");
    }
  }, [slots, hours]);

  // pulihkan draf pilihan (mis. setelah masuk/daftar dan kembali ke halaman ini)
  useEffect(() => {
    const d = loadDraft();
    if (!d || d.courtId !== court.id) return;
    const t = wibNow(Date.now()).dateISO;
    if (d.date < t || diffDays(t, d.date) > MAX_WEEKS_AHEAD * 7 - 1) return;
    const s = computeSlots(court, d.date, Date.now(), availFor(d.date));
    if (!d.hours.length || !isContiguous(d.hours) || !d.hours.every((h) => isBookable(s, h))) return;
    setPickedDate(d.date);
    setWeekOffset(Math.floor(diffDays(t, d.date) / 7));
    setHours(d.hours);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court]);

  const resetMessages = () => { setError(null); setNeedVerify(false); };

  const onSelectDate = (iso: string) => {
    setPickedDate(iso);
    setHours([]); // satu pesanan = satu tanggal (BR-04)
    resetMessages();
  };

  const onToggle = (hour: number) => {
    const r = toggleHour(hours, hour);
    setHours(r.hours);
    setError(r.error ?? null);
    setNeedVerify(false);
  };

  const onBook = () => {
    resetMessages();
    const nowReal = Date.now();
    const fresh = computeSlots(court, dateISO, nowReal, availFor(dateISO));
    setNow(nowReal);
    if (!hours.length) return setError("Pilih minimal satu jam.");
    if (!isContiguous(hours)) return setError("Jam harus berurutan.");
    if (!hours.every((h) => isBookable(fresh, h))) {
      setHours([]);
      return setError("Ada jam yang baru saja tidak tersedia. Pilih jam lain.");
    }

    const draft = { courtId: court.id, date: dateISO, hours: [...hours].sort((a, b) => a - b) };
    saveDraft(draft);

    if (auth === "guest") {
      router.push(`${ROUTES.login}?next=${encodeURIComponent(bookingHref(draft))}`);
    } else if (auth === "unverified") {
      setNeedVerify(true);
    } else {
      router.push(bookingHref(draft));
    }
  };

  return (
    <aside
      aria-label="Kalender ketersediaan"
      className="box-border w-full flex-[1_1_440px] rounded-[40px] border-[1.5px] border-line bg-white p-7 shadow-[0_28px_56px_rgba(8,44,28,.14)] min-[981px]:sticky min-[981px]:top-6 min-[981px]:max-w-[520px]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.03em]">Kalender ketersediaan</h2>
        <div className="flex items-center gap-1">
          <button
            type="button" aria-label="Minggu sebelumnya" disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            className="btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span className="min-w-[96px] text-center text-sm font-semibold text-muted">{monthYear(dateISO)}</span>
          <button
            type="button" aria-label="Minggu berikutnya" disabled={weekOffset >= MAX_WEEKS_AHEAD - 1}
            onClick={() => setWeekOffset((w) => Math.min(MAX_WEEKS_AHEAD - 1, w + 1))}
            className="btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <DateStrip startISO={stripStart} selected={dateISO} onSelect={onSelectDate} />
      <SlotGrid slots={slots} selected={hours} onToggle={onToggle} />
      <SlotLegend />
      <BookingSummary dateISO={dateISO} hours={hours} rows={rows} total={total} error={error} />

      {needVerify && (
        <div role="alert" className="mt-4 rounded-[20px] bg-[#FFF1D6] p-4 text-sm leading-[1.55] text-[#7A4B00]">
          <strong className="block font-bold">Email kamu belum diverifikasi</strong>
          Kamu belum bisa memesan sebelum email diverifikasi. Buka tautan di email kamu, atau kirim ulang tautannya. Pilihan jam kamu tetap tersimpan.
          <Link href={ROUTES.verifyEmail} className="mt-2 block font-bold underline underline-offset-4">Verifikasi email</Link>
        </div>
      )}

      <button
        type="button"
        onClick={onBook}
        disabled={hours.length === 0}
        className="btn mt-4 flex h-[58px] w-full cursor-pointer items-center justify-center gap-3 rounded-full border-0 bg-f5 text-[17px] font-bold text-white"
      >
        Pesan sekarang
        <ArrowRightIcon size={20} stroke="#C6F432" strokeWidth={2.6} />
      </button>
      {auth === "guest" && (
        <p className="mt-3 text-center text-[13px] text-muted">Kamu akan diminta masuk lebih dulu. Pilihan jam tetap tersimpan.</p>
      )}
    </aside>
  );
}
