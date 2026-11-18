import { fmtRupiah } from "@/lib/data";
import { rangeLabel, shortLabel } from "@/lib/datetime";
import type { BreakdownRow } from "@/lib/selection";

type Props = {
  dateISO: string;
  hours: number[];
  rows: BreakdownRow[];
  total: number;
  error: string | null;
};

/** Rincian pilihan sebelum melanjutkan (FR-ORD-02): tanggal, jam, harga per jam, total. */
export default function BookingSummary({ dateISO, hours, rows, total, error }: Props) {
  const sorted = [...hours].sort((a, b) => a - b);
  const has = sorted.length > 0;
  const top = has
    ? `${shortLabel(dateISO)} · ${rangeLabel(sorted[0], sorted[sorted.length - 1] + 1)}`
    : `${shortLabel(dateISO)} · belum ada jam dipilih`;

  return (
    <div className="mt-[22px] rounded-[28px] bg-f9 p-[22px] text-white">
      <div className="text-sm font-semibold text-white/80">{top}</div>
      <div className="mt-1 text-sm text-white/80">{has ? `${sorted.length} jam` : "Pilih minimal satu jam"}</div>

      {has && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-white/15 pt-3 text-[13px] text-white/80">
          {rows.map((r) => (
            <li key={r.from} className="flex justify-between gap-3">
              <span>{rangeLabel(r.from, r.to)} · {r.count} jam × {fmtRupiah(r.rate)}</span>
              <span className="font-semibold text-white">{fmtRupiah(r.subtotal)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 font-display text-[34px] font-bold tracking-[-0.03em] text-lime" aria-live="polite">
        {fmtRupiah(total)}
      </div>
      <p
        role={error ? "alert" : undefined}
        className={`mt-1.5 text-[13px] leading-[1.5] ${error ? "font-semibold text-[#FFB4B6]" : "text-white/70"}`}
      >
        {error ?? "Pilih jam yang berurutan, satu lapangan dan satu tanggal."}
      </p>
    </div>
  );
}
