"use client";

import { rangeLabel } from "@/lib/datetime";
import { dateLong } from "@/lib/payment-format";
import { useDialog } from "@/components/ui/useDialog";
import type { PaymentOrder } from "@/lib/mock-order";

type Props = { order: PaymentOrder; cancelling: boolean; error: string | null; onConfirm: () => void; onClose: () => void };

/** Dialog konfirmasi pembatalan (alertdialog). */
export default function CancelDialog({ order, cancelling, error, onConfirm, onClose }: Props) {
  const ref = useDialog<HTMLDivElement>(onClose, cancelling);
  const first = order.hours[0], last = order.hours[order.hours.length - 1];
  return (
    <div onClick={() => !cancelling && onClose()} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,34,24,.55)] p-5">
      <div
        ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="cx-t" aria-describedby="cx-d"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-[36px] bg-white p-8 shadow-[0_40px_80px_rgba(8,44,28,.3)]"
      >
        <h2 id="cx-t" className="m-0 font-display text-[26px] font-bold tracking-[-0.03em]">Batalkan pesanan ini?</h2>
        <p id="cx-d" className="mt-3.5 text-[15px] leading-[1.6] text-muted">
          Pesanan {order.kode} dibatalkan dan slot {order.courtName}, {dateLong(order.date)} {rangeLabel(first, last + 1)}, dibuka kembali untuk orang lain. Tindakan ini tidak bisa diurungkan.
        </p>
        {error && <p role="alert" className="mt-3.5 rounded-2xl bg-[#FDE4E5] px-4 py-3 text-sm font-bold text-[#B42328]">{error}</p>}
        <div className="mt-[26px] flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={cancelling} className="btn h-[50px] cursor-pointer rounded-full border-[1.5px] border-f9 bg-white px-6 text-[15px] font-bold">Kembali</button>
          <button type="button" onClick={onConfirm} disabled={cancelling} className="btn h-[50px] cursor-pointer rounded-full border-0 bg-[#B42328] px-6 text-[15px] font-bold text-white">
            {cancelling ? "Membatalkan…" : "Ya, batalkan pesanan"}
          </button>
        </div>
      </div>
    </div>
  );
}
