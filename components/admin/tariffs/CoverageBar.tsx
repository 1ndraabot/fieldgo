import { CLOSE_HOUR, OPEN_HOUR, gapMessage, type Analysis, type Cell } from "@/lib/admin-tariffs";
import { hourLabel } from "@/lib/datetime";

const CELL: Record<Cell, string> = {
  ok: "bg-f4",
  gap: "bg-[#F6C768]",
  dup: "bg-[#E4666B]",
  off: "bg-[#E3EAE6]",
};

const LEGEND: [Cell, string][] = [["ok", "Ada tarif"], ["gap", "Belum ada tarif"], ["dup", "Tumpang tindih"], ["off", "Di luar jam operasional"]];

/** Bilah cakupan 18 jam (06.00–24.00): hijau = bertarif, kuning = celah, merah = tumpang tindih, abu = di luar jam operasional. */
export default function CoverageBar({ analysis }: { analysis: Analysis }) {
  const summary = analysis.gaps.length === 0 && !analysis.cells.includes("dup")
    ? "Seluruh jam operasional tercakup tarif."
    : [gapMessage(analysis.gaps), analysis.cells.includes("dup") ? "Ada rentang yang tumpang tindih." : ""].filter(Boolean).join(" ");
  return (
    <div className="mt-5">
      <div role="img" aria-label={`Cakupan tarif 06.00 sampai 24.00. ${summary}`} className="grid grid-cols-[repeat(18,1fr)] gap-[3px]">
        {analysis.cells.map((c, i) => (
          <span key={i} className={`h-[26px] rounded-md ${CELL[c]}`} title={`${hourLabel(OPEN_HOUR + i)}–${hourLabel(OPEN_HOUR + i + 1)}`} />
        ))}
      </div>
      <div aria-hidden="true" className="mt-1.5 flex justify-between text-xs font-semibold text-muted">
        <span>06.00</span><span>12.00</span><span>18.00</span><span>{CLOSE_HOUR}.00</span>
      </div>
      <ul aria-label="Keterangan warna cakupan" className="mt-3 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-xs font-medium text-muted">
        {LEGEND.map(([k, label]) => (
          <li key={k} className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-3 w-3 rounded-[4px] ${CELL[k]}`} />{label}</li>
        ))}
      </ul>
    </div>
  );
}
