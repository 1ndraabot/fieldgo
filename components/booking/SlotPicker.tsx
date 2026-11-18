"use client";

import type { SlotInfo } from "@/lib/availability";
import { fmtRupiah } from "@/lib/data";
import { hourLabel } from "@/lib/datetime";
import { SLOT_STYLE } from "@/lib/slot-status";
import SlotLegend from "@/components/court/SlotLegend";

type Props = {
  slots: SlotInfo[] | null; // null = sedang memuat
  selected: number[];
  onToggle: (hour: number) => void;
};

/** Grid 18 jam halaman Pesan (kolom otomatis min. 110px, sesuai desain). */
export default function SlotPicker({ slots, selected, onToggle }: Props) {
  return (
    <>
      <div
        role="group"
        aria-label="Pilih jam"
        aria-busy={slots === null}
        className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2"
      >
        {slots === null
          ? Array.from({ length: 18 }, (_, i) => <div key={i} className="skel h-[58px] !rounded-2xl" />)
          : slots.map((s) => {
              const pressed = selected.includes(s.hour);
              const st = SLOT_STYLE[s.status];
              const bookable = s.status === "tersedia";
              const label = s.past ? "Sudah lewat" : st.label;
              return (
                <button
                  key={s.hour}
                  type="button"
                  disabled={!bookable}
                  aria-pressed={pressed}
                  aria-label={`${hourLabel(s.hour)} sampai ${hourLabel(s.hour + 1)}, ${pressed ? "dipilih" : label}${
                    bookable && s.price ? `, ${fmtRupiah(s.price)} per jam` : ""
                  }`}
                  onClick={() => onToggle(s.hour)}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl border-0 py-2.5 text-[15px] font-bold ${
                    pressed ? "bg-f5 text-white" : st.cls
                  } ${bookable ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  <span>{hourLabel(s.hour)}</span>
                  <small className="text-[11px] font-semibold">{pressed ? "Dipilih" : label}</small>
                </button>
              );
            })}
      </div>
      <div className="mt-[18px]">
        <SlotLegend withSelected />
      </div>
    </>
  );
}
