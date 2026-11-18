import { SLOT_STYLE } from "@/lib/slot-status";
import type { SlotStatus } from "@/lib/availability";

const SWATCH: Record<SlotStatus, string> = {
  tersedia: "bg-f1 border border-[#86E3AE]",
  terisi: "bg-[#FDE4E5]",
  ditahan: "bg-[#FFF1D6]",
  "tidak-tersedia": "bg-[#E3EAE6]",
};

export default function SlotLegend({ withSelected = false }: { withSelected?: boolean }) {
  return (
    <ul aria-label="Keterangan status slot" className="mt-[18px] flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs font-medium text-muted">
      {(Object.keys(SWATCH) as SlotStatus[]).map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-3 w-3 rounded-[4px] ${SWATCH[k]}`} />
          {SLOT_STYLE[k].legend}
        </li>
      ))}
      {withSelected && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-3 rounded-[4px] bg-f5" />
          Dipilih
        </li>
      )}
    </ul>
  );
}
