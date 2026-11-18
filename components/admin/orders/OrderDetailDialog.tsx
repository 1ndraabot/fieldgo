"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";
import { fmtRupiah } from "@/lib/data";
import { durationLabel, scheduleLabel, type AdminOrder } from "@/lib/admin-orders";
import { createdLabel } from "@/lib/payment-format";
import { ROUTES } from "@/lib/routes";
import OrderStatusChip from "./OrderStatusChip";

/** Detail ringkas satu pesanan. Keputusan verifikasi dilakukan di halaman Admin Verifikasi. */
export default function OrderDetailDialog({ order: o, onClose }: { order: AdminOrder; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Penyewa", o.penyewa], ["Lapangan", o.courtName], ["Jadwal", scheduleLabel(o)], ["Durasi", durationLabel(o.hours)],
    ["Total", fmtRupiah(o.total)], ["Dibuat", createdLabel(o.createdAtMs)],
  ];
  return (
    <DialogShell titleId="od-t" title={o.kode} onClose={onClose}>
      <div className="-mt-2"><OrderStatusChip status={o.status} /></div>
      <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3.5 gap-y-2.5 text-[15px] m:grid-cols-1 m:gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold text-muted m:mt-2">{k}</dt>
            <dd className="m-0 font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2.5">
        <Link href={`${ROUTES.admin}/verifikasi`} className="btn inline-flex h-11 items-center justify-center rounded-full border-[1.5px] border-transparent bg-f5 px-5 text-sm font-bold text-white">Buka antrean verifikasi</Link>
        <Button variant="outline" size="sm" onClick={onClose}>Selesai</Button>
      </div>
    </DialogShell>
  );
}
