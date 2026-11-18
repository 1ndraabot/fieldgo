import { fmtRupiah } from "@/lib/data";
import { createdLabel } from "@/lib/payment-format";
import type { PaymentItem } from "@/lib/mock-verification";

/**
 * Tampilan contoh bukti transfer (dirender dari data contoh, bukan berkas sungguhan).
 * Saat backend tersedia, ganti dengan <img>/<iframe> berkas bukti milik pesanan.
 */
export default function ProofReceipt({ item, large = false }: { item: PaymentItem; large?: boolean }) {
  const { proof } = item;
  return (
    <div className={`box-border rounded-[28px] border-[1.5px] border-line bg-f0 ${large ? "p-7" : "p-6"}`}>
      <div className="text-xs font-bold tracking-[.06em] text-muted">BUKTI TRANSFER{proof.kind === "pdf" ? " · PDF" : ""}</div>
      <div className="mt-3.5 flex items-center gap-2 text-sm font-bold text-f6">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-f5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
        </span>
        Transfer berhasil
      </div>
      <div className={`mt-2.5 font-display font-extrabold tracking-[-0.04em] ${large ? "text-[40px]" : "text-[32px]"}`}>{fmtRupiah(proof.amount)}</div>
      <div className="mt-1.5 text-[13px] font-medium text-muted">{proof.bank} · {createdLabel(proof.paidAtMs)}</div>
      <div aria-hidden="true" className="mt-[22px] h-2.5 w-[88%] rounded-md bg-f1" />
      <div aria-hidden="true" className="mt-3 h-2.5 w-[64%] rounded-md bg-f1" />
      {large && (
        <dl className="mt-6 grid gap-2.5 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="font-medium text-muted">Berkas</dt><dd className="m-0 break-all text-right font-bold">{proof.fileName}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-medium text-muted">Total pesanan</dt><dd className="m-0 font-bold">{fmtRupiah(item.total)}</dd></div>
          <div className="flex justify-between gap-3">
            <dt className="font-medium text-muted">Nominal pada bukti</dt>
            <dd className={`m-0 font-bold ${proof.amount === item.total ? "text-f6" : "text-[#B42328]"}`}>
              {proof.amount === item.total ? "Sesuai total pesanan" : "Tidak sama dengan total pesanan"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
