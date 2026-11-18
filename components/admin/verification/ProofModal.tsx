"use client";

import DialogShell from "@/components/ui/DialogShell";
import { dateLong } from "@/lib/payment-format";
import { rangeLabel } from "@/lib/datetime";
import type { PaymentItem } from "@/lib/mock-verification";
import ProofReceipt from "./ProofReceipt";

type Props = { item: PaymentItem; onClose: () => void; onApprove?: () => void; onReject?: () => void };

/** Pratinjau bukti transfer (modal). Aksi cepat hanya muncul bila pesanan masih menunggu verifikasi. */
export default function ProofModal({ item, onClose, onApprove, onReject }: Props) {
  return (
    <DialogShell titleId="pm-t" title={`Bukti ${item.kode}`} onClose={onClose} wide>
      <p className="-mt-2 text-[15px] leading-[1.6] text-muted">
        {item.penyewa} · {item.courtName} · {dateLong(item.date)} · {rangeLabel(item.hours[0], item.hours[item.hours.length - 1] + 1)}
      </p>
      <ProofReceipt item={item} large />
      <p className="text-[13px] text-muted">Tampilan contoh dari data demo. Cocokkan nominal dengan mutasi rekening sebelum menyetujui.</p>
      <div className="flex flex-wrap justify-end gap-3">
        {onReject && <button type="button" onClick={onReject} className="btn h-[50px] cursor-pointer rounded-full border-[1.5px] border-[#B42328] bg-white px-6 text-[15px] font-bold text-[#B42328]">Tolak</button>}
        {onApprove && <button type="button" onClick={onApprove} className="btn h-[50px] cursor-pointer rounded-full border-0 bg-f5 px-6 text-[15px] font-bold text-white">Setujui</button>}
        <button type="button" onClick={onClose} className="btn h-[50px] cursor-pointer rounded-full border-[1.5px] border-f9 bg-white px-6 text-[15px] font-bold">Tutup</button>
      </div>
    </DialogShell>
  );
}
