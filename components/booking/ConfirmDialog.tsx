"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { fmtRupiah } from "@/lib/data";
import { rangeLabel } from "@/lib/datetime";
import type { BookingErrorCode } from "@/lib/booking-errors";
import { ROUTES } from "@/lib/routes";
import Banner from "./Banner";
import type { SummaryLine } from "./OrderSummary";

type Props = {
  courtName: string;
  dateLabel: string;
  lines: SummaryLine[];
  total: number;
  deadline: string;
  submitting: boolean;
  error: { code: BookingErrorCode; message: string } | null;
  onCreate: () => void;
  onReload: () => void;
  onClose: () => void;
};

const SLOT_ERRORS: BookingErrorCode[] = ["SLOT_TAKEN", "SLOT_PAST", "SLOT_UNAVAILABLE"];
const BTN = "btn inline-flex h-14 cursor-pointer items-center justify-center rounded-full border-[1.5px] px-7 text-base font-bold";

/** Dialog konfirmasi: rincian akhir + tombol "Buat pesanan". */
export default function ConfirmDialog({ courtName, dateLabel, lines, total, deadline, submitting, error, onCreate, onReload, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const first = lines[0]?.hour ?? 0;
  const last = lines[lines.length - 1]?.hour ?? 0;
  const slotError = error !== null && SLOT_ERRORS.includes(error.code);

  // fokus ke dialog, Escape menutup, Tab tidak keluar dari dialog
  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement as HTMLElement | null;
    el?.querySelector<HTMLElement>("button:not([disabled]), a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) return onClose();
      if (e.key !== "Tab" || !el) return;
      const f = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
      if (!f.length) return;
      const a = f[0], b = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [onClose, submitting]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(7,34,24,.55)] p-6 pt-[120px] backdrop-blur-[3px] m:pt-10">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dk" className="flex w-full max-w-[520px] flex-col gap-[18px] rounded-[32px] bg-white p-8 shadow-[0_40px_80px_rgba(0,0,0,.35)]">
        <h2 id="dk" className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.2] tracking-[-0.03em]">Konfirmasi pesanan</h2>

        <dl className="m-0 grid gap-2.5 text-[15px]">
          {[["Lapangan", courtName], ["Tanggal", dateLabel], ["Jam", `${rangeLabel(first, last + 1)} (${lines.length} jam)`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="font-medium text-muted">{k}</dt>
              <dd className="m-0 text-right font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-2 rounded-[28px] border-[1.5px] border-line bg-f0 p-6 text-[15px]">
          {lines.map((l) => (
            <div key={l.hour} className="flex justify-between">
              <span className="font-medium text-muted">{rangeLabel(l.hour, l.hour + 1)}</span>
              <b>{fmtRupiah(l.price)}</b>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <b>Total</b>
            <span className="font-display text-[22px] font-bold text-f5">{fmtRupiah(total)}</span>
          </div>
        </div>

        <Banner tone="amber" className="!text-sm">
          Bayar sebelum <b>{deadline}</b>. Pesanan tanpa bukti sampai batas ini otomatis kedaluwarsa.
        </Banner>

        {error && (
          <Banner tone="red" role="alert">
            {error.message}
            {error.code === "EMAIL_NOT_VERIFIED" && (
              <> <Link href={ROUTES.verifyEmail} className="font-bold underline">Verifikasi email sekarang</Link></>
            )}
            {error.code === "UNAUTHENTICATED" && (
              <> <Link href={ROUTES.login} className="font-bold underline">Masuk</Link></>
            )}
          </Banner>
        )}

        <div className="flex flex-wrap gap-3">
          {slotError ? (
            <button type="button" onClick={onReload} className={`${BTN} border-transparent bg-f5 text-white`}>Muat ulang kalender</button>
          ) : (
            <button type="button" onClick={onCreate} disabled={submitting} className={`${BTN} border-transparent bg-f5 text-white`}>
              {submitting ? "Membuat pesanan…" : "Buat pesanan"}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={submitting} className={`${BTN} border-f9 text-f9`}>Kembali</button>
        </div>
      </div>
    </div>
  );
}
