import { fmtRupiah } from "@/lib/data";
import { hourLabel } from "@/lib/datetime";
import type { Tariff } from "@/lib/court-detail";

const ORDER = { weekday: 0, weekend: 1 } as const;

export default function PriceTable({ tariffs }: { tariffs: Tariff[] }) {
  const rows = [...tariffs].sort((a, b) => ORDER[a.tipe] - ORDER[b.tipe] || a.mulai - b.mulai);
  const grid = "grid grid-cols-[1.1fr_1.3fr_1fr] px-6";
  return (
    <div className="overflow-x-auto rounded-[28px] border-[1.5px] border-line">
      <table className="w-full min-w-[460px] border-collapse text-left">
        <caption className="sr-only">Harga per jam berdasarkan tipe hari dan rentang jam</caption>
        <thead>
          <tr className="bg-f0 text-[13px] font-bold tracking-[.02em] text-muted">
            <th scope="col" className="px-6 py-4 font-bold">Tipe hari</th>
            <th scope="col" className="px-6 py-4 font-bold">Jam</th>
            <th scope="col" className="px-6 py-4 font-bold">Harga per jam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={`${t.tipe}-${t.mulai}`} className="border-t border-line text-base font-semibold">
              <td className="px-6 py-[18px] capitalize">{t.tipe}</td>
              <td className="px-6 py-[18px] text-muted">{hourLabel(t.mulai)}–{hourLabel(t.selesai)}</td>
              <td className="px-6 py-[18px] font-display font-bold text-f5">{fmtRupiah(t.harga)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
