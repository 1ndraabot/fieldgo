import Button from "@/components/ui/Button";
import { fmtRupiah } from "@/lib/data";
import { durationLabel, scheduleLabel, type AdminOrder } from "@/lib/admin-orders";
import { createdLabel } from "@/lib/payment-format";
import OrderStatusChip from "./OrderStatusChip";

const TH = "whitespace-nowrap bg-f0 px-5 py-4 text-left text-[13px] font-bold tracking-[.02em] text-muted";
const TD = "border-t border-line px-5 py-4 align-middle font-semibold";

/** Tabel pesanan. Menggulir horizontal pada layar sempit. */
export default function OrdersTable({ rows, onOpen }: { rows: AdminOrder[]; onOpen: (kode: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-[28px] border-[1.5px] border-line bg-white">
      <table className="w-full min-w-[1080px] border-collapse text-[15px]">
        <caption className="sr-only">Daftar pesanan</caption>
        <thead>
          <tr>
            {["Kode", "Penyewa", "Lapangan", "Jadwal", "Durasi", "Total", "Status", "Dipesan"].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}
            <th scope="col" className={TH}><span className="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.kode} className="hover:bg-[#FAFEFB]">
              <td className={`${TD} whitespace-nowrap`}><b>{o.kode}</b></td>
              <td className={TD}>{o.penyewa}</td>
              <td className={`${TD} whitespace-nowrap`}>{o.courtName}</td>
              <td className={`${TD} whitespace-nowrap`}>{scheduleLabel(o)}</td>
              <td className={`${TD} whitespace-nowrap`}>{durationLabel(o.hours)}</td>
              <td className={`${TD} whitespace-nowrap font-display font-bold`}>{fmtRupiah(o.total)}</td>
              <td className={TD}><OrderStatusChip status={o.status} /></td>
              <td className={`${TD} whitespace-nowrap text-[13px] font-medium text-muted`}>{createdLabel(o.createdAtMs)}</td>
              <td className={TD}><Button variant="outline" size="sm" onClick={() => onOpen(o.kode)} aria-label={`Lihat detail ${o.kode}`}>Detail</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
