"use client";

import Button from "@/components/ui/Button";
import { inputClass } from "@/components/ui/FormField";
import { fmtRupiah } from "@/lib/data";
import type { DayType, TariffRow } from "@/lib/admin-tariffs";

type Props = {
  index: number;
  tipe: DayType;
  row: TariffRow;
  error: string;
  readOnly: boolean;
  onChange: (patch: Partial<Pick<TariffRow, "start" | "end" | "price">>) => void;
  onDelete: () => void;
};

const LBL = "mb-1.5 block text-xs font-bold text-muted";

/** Satu rentang tarif: jam mulai, jam selesai, harga per jam (Rp). Galat tampil langsung di bawah baris. */
export default function TariffRowEditor({ index, tipe, row, error, readOnly, onChange, onDelete }: Props) {
  const id = `${tipe}-${row.key}`;
  const bad = !!error;
  const priceNum = /^\d+$/.test(row.price.trim()) ? Number(row.price) : NaN;
  const field = (suffix: string) => ({ id: `${id}-${suffix}`, readOnly, "aria-invalid": bad ? true : undefined, "aria-describedby": bad ? `${id}-err` : undefined });
  return (
    <div role="group" aria-label={`Rentang ${index + 1}`} className="grid grid-cols-[110px_110px_1fr_auto] items-start gap-3 m:grid-cols-2">
      <div>
        <label htmlFor={`${id}-s`} className={LBL}>Jam mulai</label>
        <input {...field("s")} type="number" min={6} max={23} step={1} inputMode="numeric" value={row.start} onChange={(e) => onChange({ start: e.target.value })} className={inputClass(bad)} />
      </div>
      <div>
        <label htmlFor={`${id}-e`} className={LBL}>Jam selesai</label>
        <input {...field("e")} type="number" min={7} max={24} step={1} inputMode="numeric" value={row.end} onChange={(e) => onChange({ end: e.target.value })} className={inputClass(bad)} />
      </div>
      <div className="m:col-span-2">
        <label htmlFor={`${id}-p`} className={LBL}>Harga per jam (Rp)</label>
        <input {...field("p")} type="text" inputMode="numeric" autoComplete="off" placeholder="90000" value={row.price} onChange={(e) => onChange({ price: e.target.value })} className={inputClass(bad)} />
        <span className="mt-1 block min-h-[18px] text-xs font-semibold text-muted">{priceNum > 0 ? fmtRupiah(priceNum) : ""}</span>
      </div>
      <div className="pt-[22px] m:col-span-2 m:pt-0">
        <Button variant="outline" size="sm" onClick={onDelete} disabled={readOnly} aria-label={`Hapus rentang ${index + 1}`}>Hapus</Button>
      </div>
      {bad && <p id={`${id}-err`} role="alert" className="col-span-full -mt-1 text-[13px] font-bold text-[#B42328]">{error}</p>}
    </div>
  );
}
