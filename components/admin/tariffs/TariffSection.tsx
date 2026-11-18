"use client";

import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import { gapMessage, type Analysis, type DayType, type TariffRow } from "@/lib/admin-tariffs";
import CoverageBar from "./CoverageBar";
import TariffRowEditor from "./TariffRowEditor";

type Props = {
  tipe: DayType;
  title: string;
  sub: string;
  rows: TariffRow[];
  analysis: Analysis;
  readOnly: boolean;
  onChangeRow: (key: string, patch: Partial<Pick<TariffRow, "start" | "end" | "price">>) => void;
  onAddRow: () => void;
  onDeleteRow: (key: string) => void;
};

/** Seksi satu tipe hari (Hari kerja / Akhir pekan): bilah cakupan, daftar rentang, tombol tambah, dan peringatan celah. */
export default function TariffSection({ tipe, title, sub, rows, analysis, readOnly, onChangeRow, onAddRow, onDeleteRow }: Props) {
  return (
    <section aria-label={`Tarif ${title}`} className="rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]">{title} <span className="text-sm font-semibold text-muted">{tipe}</span></h3>
        <span className="text-[13px] font-semibold text-muted">{sub}</span>
      </div>

      <CoverageBar analysis={analysis} />

      {analysis.gaps.length > 0 && (
        <Banner tone="amber" role="note" icon="alert" className="mt-4 !rounded-[22px] !px-5 !py-3.5 !text-sm">{gapMessage(analysis.gaps)}</Banner>
      )}

      <div className="mt-5 flex flex-col gap-[18px]">
        {rows.length === 0 ? (
          <p className="rounded-3xl border-[1.5px] border-dashed border-[#86E3AE] bg-f0 px-5 py-6 text-center text-[15px] font-semibold text-muted">
            Belum ada rentang tarif untuk {title.toLowerCase()}. Klik “Tambah rentang jam”.
          </p>
        ) : (
          rows.map((r, i) => (
            <TariffRowEditor
              key={r.key} index={i} tipe={tipe} row={r} error={analysis.errors[i]} readOnly={readOnly}
              onChange={(patch) => onChangeRow(r.key, patch)} onDelete={() => onDeleteRow(r.key)}
            />
          ))
        )}
      </div>

      <div className="mt-5">
        <Button variant="outline" size="sm" onClick={onAddRow} disabled={readOnly}>+ Tambah rentang jam</Button>
      </div>
    </section>
  );
}
