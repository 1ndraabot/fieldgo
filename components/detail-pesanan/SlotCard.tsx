"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "@/components/detail-pesanan/ui/Icons";
import { HERO_PRICE_PER_HOUR, HERO_SLOTS, fmtRupiah } from "@/lib/data";
import { ROUTES } from "@/lib/routes";

/** Kartu pilih jam interaktif di hero. */
export default function SlotCard() {
  const [sel, setSel] = useState<string[]>(["20.00", "21.00"]);
  const sorted = [...sel].sort();

  const toggle = (t: string) =>
    setSel((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  let summary = "Pilih jam main";
  if (sorted.length) {
    const last = parseInt(sorted[sorted.length - 1], 10) + 1;
    summary = `${sorted[0]}–${last < 10 ? "0" : ""}${last}.00 · ${sorted.length} jam`;
  }

  return (
    <div className="absolute -bottom-[76px] right-[-90px] box-border w-[340px] max-w-[92%] rounded-[28px] border border-line bg-white p-[22px] text-left shadow-[0_24px_48px_rgba(8,44,28,.28)] m:right-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[17px] font-bold">Futsal Arena A</span>
        <span className="rounded-full bg-f1 px-3 py-[5px] text-xs font-bold text-f6">Sab, 7 Nov</span>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {HERO_SLOTS.map(([t, st]) => {
          const pressed = sel.includes(t);
          const taken = st === "x";
          const cls = pressed
            ? "bg-f5 text-white"
            : taken
              ? "bg-[#FDE4E5] text-[#B42328]"
              : "bg-f1 text-f6";
          return (
            <button
              key={t}
              type="button"
              disabled={taken}
              aria-pressed={pressed}
              onClick={() => toggle(t)}
              className={`h-11 rounded-[14px] text-sm font-bold ${cls} ${taken ? "cursor-not-allowed" : "cursor-pointer"
                }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2.5">
        <div>
          <div className="text-xs font-medium text-muted" aria-live="polite">{summary}</div>
          <div className="font-display text-[22px] font-bold text-f5">
            {fmtRupiah(sorted.length * HERO_PRICE_PER_HOUR)}
          </div>
        </div>
        <Link
          href={ROUTES.book}
          aria-label="Lanjut memesan"
          className="btn flex h-12 w-12 items-center justify-center rounded-full bg-f5"
        >
          <ArrowUpRightIcon size={22} stroke="#fff" strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}
