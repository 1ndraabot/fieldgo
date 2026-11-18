"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DateStrip from "@/components/court/DateStrip";
import type { AuthStatus } from "@/lib/auth";
import { MAX_WEEKS_AHEAD, isBookable, type SlotInfo } from "@/lib/availability";
import { ERROR_MESSAGE, type BookingErrorCode } from "@/lib/booking-errors";
import { clearDraft, loadDraft, saveDraft } from "@/lib/booking-draft";
import type { CourtOption, CreateOrderResponse, SlotsResponse } from "@/lib/booking-types";
import { addDays, diffDays, longLabel, monthYear, wibNow } from "@/lib/datetime";
import { formatDeadline, paymentDeadlineMs } from "@/lib/payment-deadline";
import { ROUTES } from "@/lib/routes";
import { toggleHourStrict } from "@/lib/selection";
import Banner from "./Banner";
import ConfirmDialog from "./ConfirmDialog";
import OrderSummary, { type SummaryLine } from "./OrderSummary";
import SlotPicker from "./SlotPicker";

type Props = {
  courts: CourtOption[];
  auth: AuthStatus;
  nowMs: number;
  batasBayarJam: number;
  initial: { courtId: string; date: string; slots: SlotInfo[]; hours: number[]; note: string | null; fromQuery: boolean };
};

const CARD = "rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)]";
const ARROW = "btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-white";

export default function BookingFlow({ courts, auth, nowMs, batasBayarJam, initial }: Props) {
  const router = useRouter();
  const todayISO = wibNow(nowMs).dateISO;

  const [courtId, setCourtId] = useState(initial.courtId);
  const [dateISO, setDateISO] = useState(initial.date);
  const [hours, setHours] = useState<number[]>(initial.hours);
  const [weekOffset, setWeekOffset] = useState(Math.max(0, Math.floor(diffDays(todayISO, initial.date) / 7)));
  const [error, setError] = useState<string | null>(initial.note);
  const [now, setNow] = useState(nowMs);

  const key = `${courtId}|${dateISO}`;
  const [loaded, setLoaded] = useState<{ key: string; slots: SlotInfo[] } | null>({ key, slots: initial.slots });
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const slots = loaded && loaded.key === key ? loaded.slots : null;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<{ code: BookingErrorCode; message: string } | null>(null);

  // jam berjalan (untuk batas bayar yang ditampilkan)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // muat ketersediaan dari server saat lapangan/tanggal berganti (data awal sudah dikirim server)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const ctl = new AbortController();
    setLoadError(false);
    fetch(`/api/ketersediaan?lapangan=${encodeURIComponent(courtId)}&tanggal=${dateISO}`, { signal: ctl.signal, cache: "no-store" })
      .then((r) => r.json() as Promise<SlotsResponse | { ok: false }>)
      .then((j) => (j.ok ? setLoaded({ key: `${courtId}|${dateISO}`, slots: j.slots }) : setLoadError(true)))
      .catch((e: unknown) => { if (!(e instanceof DOMException && e.name === "AbortError")) setLoadError(true); });
    return () => ctl.abort();
  }, [courtId, dateISO, reloadToken]);

  // pulihkan draf dari halaman Detail bila halaman dibuka tanpa query (mis. setelah masuk)
  useEffect(() => {
    if (initial.fromQuery) return;
    const d = loadDraft();
    if (!d || !courts.some((c) => c.id === d.courtId) || d.date < todayISO || diffDays(todayISO, d.date) > MAX_WEEKS_AHEAD * 7 - 1) return;
    setCourtId(d.courtId); setDateISO(d.date); setHours(d.hours);
    setWeekOffset(Math.floor(diffDays(todayISO, d.date) / 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lepas jam yang ternyata tidak tersedia pada data yang baru dimuat
  useEffect(() => {
    if (slots && hours.length && !hours.every((h) => isBookable(slots, h))) {
      setHours((prev) => prev.filter((h) => isBookable(slots, h)));
      setError("Sebagian jam pilihanmu sudah tidak tersedia. Periksa kembali pilihanmu.");
    }
  }, [slots, hours]);

  // simpan pilihan di URL agar bertahan saat muat ulang / masuk
  const pesanHref = useMemo(() => {
    const q = new URLSearchParams({ lapangan: courtId, tanggal: dateISO });
    if (hours.length) q.set("jam", hours.join(","));
    return `${ROUTES.book}?${q.toString()}`;
  }, [courtId, dateISO, hours]);
  useEffect(() => { window.history.replaceState(null, "", pesanHref); }, [pesanHref]);

  const court = courts.find((c) => c.id === courtId) ?? courts[0];
  const stripStart = addDays(todayISO, weekOffset * 7);

  const lines: SummaryLine[] = useMemo(
    () => (slots ? hours.filter((h) => isBookable(slots, h)).map((h) => ({ hour: h, price: slots.find((s) => s.hour === h)?.price ?? 0 })) : []),
    [slots, hours],
  );
  const total = lines.reduce((a, l) => a + l.price, 0);
  const deadline = lines.length ? formatDeadline(paymentDeadlineMs(now, dateISO, lines[0].hour, batasBayarJam)) : null;

  const resetMessages = () => { setError(null); setOrderError(null); };
  const onCourt = (id: string) => { setCourtId(id); setHours([]); resetMessages(); };
  const onDate = (iso: string) => { setDateISO(iso); setHours([]); resetMessages(); };
  const onPick = (h: number) => { const r = toggleHourStrict(hours, h); setHours(r.hours); setError(r.error ?? null); };

  const reload = useCallback(() => {
    setConfirmOpen(false); setOrderError(null); setHours([]); setError(null);
    setLoaded(null); setReloadToken((n) => n + 1);
  }, []);

  const createOrder = async () => {
    setSubmitting(true); setOrderError(null);
    try {
      // hanya lapangan, tanggal, dan jam yang dikirim — harga/total/status/pengguna ditentukan server
      const res = await fetch("/api/pesanan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lapangan: courtId, tanggal: dateISO, jam: hours }),
      });
      const j = (await res.json()) as CreateOrderResponse;
      if (j.ok) { clearDraft(); router.push(j.redirect); return; } // tetap "memproses" sampai pindah halaman
      setOrderError({ code: j.code, message: j.message });
    } catch {
      setOrderError({ code: "INTERNAL", message: ERROR_MESSAGE.INTERNAL });
    }
    setSubmitting(false);
  };

  const loginHref = `${ROUTES.login}?next=${encodeURIComponent(pesanHref)}`;

  return (
    <div className="mt-7 flex flex-wrap items-start gap-8">
      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-7">
        <div className={`${CARD} flex flex-col gap-[22px]`}>
          <div className="flex flex-col gap-2">
            <label htmlFor="lap" className="text-sm font-bold">Lapangan</label>
            <select
              id="lap" value={courtId} onChange={(e) => onCourt(e.target.value)}
              className="h-[54px] w-full cursor-pointer rounded-[18px] border-[1.5px] border-line bg-white px-[18px] text-base font-medium focus:border-f5 focus:outline-none focus:ring-4 focus:ring-f3/20"
            >
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.sport}</option>)}
            </select>
          </div>
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="text-sm font-bold" id="tgl-label">Tanggal · {monthYear(dateISO)}</div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Minggu sebelumnya" disabled={weekOffset === 0} onClick={() => setWeekOffset((w) => Math.max(0, w - 1))} className={ARROW}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button type="button" aria-label="Minggu berikutnya" disabled={weekOffset >= MAX_WEEKS_AHEAD - 1} onClick={() => setWeekOffset((w) => Math.min(MAX_WEEKS_AHEAD - 1, w + 1))} className={ARROW}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </div>
            <div className="-mt-5"><DateStrip startISO={stripStart} selected={dateISO} onSelect={onDate} /></div>
          </div>
        </div>

        <div className={CARD} aria-live="polite">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em]">Pilih jam (berurutan)</h2>
            <span className="text-sm font-semibold text-muted">Slot 1 jam · 06.00–24.00</span>
          </div>
          {error && <Banner tone="red" role="alert" className="mb-3.5">{error}</Banner>}
          {loadError && (
            <Banner tone="red" role="alert" className="mb-3.5">
              Ketersediaan belum bisa dimuat.{" "}
              <button type="button" onClick={() => { setLoaded(null); setReloadToken((n) => n + 1); }} className="cursor-pointer font-bold underline">Coba lagi</button>
            </Banner>
          )}
          <SlotPicker slots={slots} selected={hours} onToggle={onPick} />
        </div>
      </div>

      <OrderSummary
        courtName={court.name}
        dateLabel={longLabel(dateISO) + " " + monthYear(dateISO).split(" ")[1]}
        lines={lines} total={total} deadline={deadline} auth={auth}
        loginHref={loginHref}
        onLoginClick={() => { if (hours.length) saveDraft({ courtId, date: dateISO, hours }); }}
        onConfirm={() => { setOrderError(null); setConfirmOpen(true); }}
      />

      {confirmOpen && lines.length > 0 && deadline && (
        <ConfirmDialog
          courtName={court.name} dateLabel={longLabel(dateISO) + " " + monthYear(dateISO).split(" ")[1]}
          lines={lines} total={total} deadline={deadline}
          submitting={submitting} error={orderError}
          onCreate={createOrder} onReload={reload} onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
