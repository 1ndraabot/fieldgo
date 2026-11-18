import { DAY_NAMES, hourLabel } from "@/lib/datetime";
import type { DayHours } from "@/lib/court-detail";

export default function OperatingHours({ hours }: { hours: DayHours[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-12">
      {hours.map((h, i) => (
        <div key={DAY_NAMES[i]} className="flex justify-between border-b border-line py-3.5 text-base">
          <dt className="font-bold">{DAY_NAMES[i]}</dt>
          <dd className="font-medium text-muted">{h.open ? `${hourLabel(h.buka)}–${hourLabel(h.tutup)}` : "Tutup"}</dd>
        </div>
      ))}
    </dl>
  );
}
