"use client";

import { addDays, dayIndex, dayOfMonth, longLabel, DAY_SHORT } from "@/lib/datetime";

type Props = {
  startISO: string; // tanggal pertama pada strip (7 hari)
  selected: string;
  onSelect: (iso: string) => void;
};

export default function DateStrip({ startISO, selected, onSelect }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startISO, i));
  return (
    <div role="group" aria-label="Pilih tanggal" className="mt-5 grid grid-cols-7 gap-1.5">
      {days.map((iso) => {
        const active = iso === selected;
        return (
          <button
            key={iso}
            type="button"
            aria-pressed={active}
            aria-label={longLabel(iso)}
            onClick={() => onSelect(iso)}
            className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-[18px] border-[1.5px] py-3 ${
              active ? "border-f5 bg-f5 text-white" : "border-line bg-white text-f9"
            }`}
          >
            <span className="text-xs font-semibold">{DAY_SHORT[dayIndex(iso)]}</span>
            <span className="font-display text-xl font-bold">{dayOfMonth(iso)}</span>
          </button>
        );
      })}
    </div>
  );
}
