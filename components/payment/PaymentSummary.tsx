import { fmtRupiah } from "@/lib/data";
import { rangeLabel } from "@/lib/datetime";
import { createdLabel, dateLong } from "@/lib/payment-format";
import type { PaymentOrder } from "@/lib/mock-order";
import { STATUS_CHIP, type PaymentStatus } from "./status";

/** Ringkasan pesanan (kolom kanan, sticky di desktop). */
export default function PaymentSummary({ order, status }: { order: PaymentOrder; status: PaymentStatus }) {
  const chip = STATUS_CHIP[status];
  const first = order.hours[0];
  const last = order.hours[order.hours.length - 1];
  const rows: [string, string][] = [
    ["Lapangan", order.courtName],
    ["Tanggal", dateLong(order.date)],
    ["Jam", `${rangeLabel(first, last + 1)} (${order.hours.length} jam)`],
    ["Dibuat", createdLabel(order.createdAtMs)],
  ];
  return (
    <aside
      aria-label="Ringkasan pesanan"
      className="box-border w-full flex-[1_1_400px] rounded-[40px] border-[1.5px] border-line bg-white p-[30px] shadow-[0_28px_56px_rgba(8,44,28,.14)] min-[981px]:sticky min-[981px]:top-6 min-[981px]:max-w-[464px]"
    >
      <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-bold ${chip.cls}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${chip.dot}`} />
        {chip.label}
      </span>
      <div className="mt-4 font-display text-[26px] font-bold tracking-[-0.03em]" aria-label={`Kode pesanan ${order.kode}`}>{order.kode}</div>
      <dl className="mt-5 grid gap-3.5 text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="font-medium text-muted">{k}</dt>
            <dd className="m-0 text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-[22px] grid gap-3 rounded-3xl bg-f0 p-5 text-[15px]">
        {order.hours.map((h, i) => (
          <div key={h} className="flex justify-between">
            <span className="font-medium text-muted">{rangeLabel(h, h + 1)}</span>
            <span className="font-bold">{fmtRupiah(order.ratePerHour[i])}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="font-bold">Total</span>
          <span className="font-display text-[22px] font-bold text-f5">{fmtRupiah(order.total)}</span>
        </div>
      </div>
      <p className="mt-[18px] text-[13px] leading-[1.6] text-muted">Harga dikunci saat pesanan dibuat dan tidak berubah meski tarif diubah.</p>
    </aside>
  );
}
