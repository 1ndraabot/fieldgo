"use client";

import type { SlotInfo } from "@/lib/availability";
import { fmtRupiah } from "@/lib/data";
import { hourLabel } from "@/lib/datetime";
import { SLOT_STYLE } from "@/lib/slot-status";

type Props = {
  slots: SlotInfo[];
  selected: number[];
  onToggle: (hour: number) => void;
};

/** 18 slot jam (06.00–23.00). Hanya slot "Tersedia" yang dapat dipilih. */
export default function SlotGrid({ slots, selected, onToggle }: Props) {
  return (
    <div role="group" aria-label="Pilih jam" className="mt-5 grid grid-cols-3 gap-2">
      {slots.map((s) => {
        const pressed = selected.includes(s.hour);
        const st = SLOT_STYLE[s.status];
        const bookable = s.status === "tersedia";
        const label = s.past ? "Sudah lewat" : st.label;
        const cls = pressed ? "bg-f5 text-white" : st.cls;
        const aria = `${hourLabel(s.hour)} sampai ${hourLabel(s.hour + 1)}, ${pressed ? "dipilih" : label}${
          bookable && s.price ? `, ${fmtRupiah(s.price)} per jam` : ""
        }`;
        return (
          <button
            key={s.hour}
            type="button"
            disabled={!bookable}
            aria-pressed={pressed}
            aria-label={aria}
            onClick={() => onToggle(s.hour)}
            className={`flex flex-col items-center gap-0.5 rounded-2xl border-0 py-2.5 ${cls} ${
              bookable ? "cursor-pointer" : "cursor-not-allowed"
            }`}
          >
            <span className="text-[15px] font-bold">{hourLabel(s.hour)}</span>
            <span className="text-[11px] font-semibold">{pressed ? "Dipilih" : label}</span>
          </button>
        );
      })}
    </div>
  );
}
