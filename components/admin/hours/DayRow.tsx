"use client";

import { inputClass } from "@/components/ui/FormField";
import Switch from "@/components/ui/Switch";
import { barPercent } from "@/lib/admin-hours";
import type { DayHours } from "@/lib/court-detail";
import { DAY_NAMES, hourLabel } from "@/lib/datetime";

type Props = {
  index: number;
  value: DayHours;
  error: string | null;
  disabled: boolean;
  onToggle: () => void;
  onOpen: (h: number) => void;
  onClose: (h: number) => void;
};

const OPEN_OPTIONS = Array.from({ length: 18 }, (_, i) => 6 + i);  // 06.00–23.00
const CLOSE_OPTIONS = Array.from({ length: 18 }, (_, i) => 7 + i); // 07.00–24.00

/** Satu hari: sakelar buka/tutup, jam buka, jam tutup, dan bilah rentang pada skala 06–24. */
export default function DayRow({ index, value: v, error, disabled, onToggle, onOpen, onClose }: Props) {
  const name = DAY_NAMES[index];
  const bar = barPercent(v);
  const tone = error ? "border-[#E4666B] bg-[#FFF6F6]" : v.open ? "border-line bg-white" : "border-line bg-f0";
  const sel = (suffix: string) => ({ id: `${suffix}${index}`, disabled: disabled || !v.open, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `err${index}` : undefined });
  return (
    <div role="group" aria-label={name} className={`grid grid-cols-[150px_130px_1fr_1fr] items-end gap-4 rounded-3xl border-[1.5px] px-5 py-4 m:grid-cols-2 ${tone}`}>
      <div className="flex items-center gap-3 text-base font-bold m:col-span-2">
        <Switch checked={v.open} disabled={disabled} onChange={onToggle} label={`${v.open ? "Tutup" : "Buka"} ${name}`} />
        {name}
        <span className={`ml-auto hidden h-[30px] items-center rounded-full px-3.5 text-[13px] font-bold m:inline-flex ${v.open ? "bg-f1 text-f6" : "bg-[#E3EAE6] text-[#3F5247]"}`}>{v.open ? "Buka" : "Tutup"}</span>
      </div>
      <div className="flex h-[52px] items-center m:hidden">
        <span className={`inline-flex h-[30px] items-center rounded-full px-3.5 text-[13px] font-bold ${v.open ? "bg-f1 text-f6" : "bg-[#E3EAE6] text-[#3F5247]"}`}>{v.open ? "Buka" : "Tutup"}</span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`o${index}`} className="text-xs font-bold text-muted">Buka</label>
        <select {...sel("o")} value={v.buka} onChange={(e) => onOpen(Number(e.target.value))} className={`${inputClass(!!error)} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}>
          {OPEN_OPTIONS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`c${index}`} className="text-xs font-bold text-muted">Tutup</label>
        <select {...sel("c")} value={v.tutup} onChange={(e) => onClose(Number(e.target.value))} className={`${inputClass(!!error)} cursor-pointer disabled:cursor-not-allowed disabled:opacity-50`}>
          {CLOSE_OPTIONS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
      </div>
      <div aria-hidden="true" className="relative col-span-full h-2 rounded-full bg-f1">
        {bar && <b className="absolute inset-y-0 rounded-full bg-f4" style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />}
      </div>
      {error && <p id={`err${index}`} role="alert" className="col-span-full -mt-1 text-[13px] font-bold text-[#B42328]">{error}</p>}
    </div>
  );
}
