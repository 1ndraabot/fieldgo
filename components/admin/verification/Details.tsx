import Banner from "@/components/booking/Banner";
import { fmtRupiah } from "@/lib/data";
import { rangeLabel } from "@/lib/datetime";
import { createdLabel, dateLong } from "@/lib/payment-format";
import { statusAfterCancellation, statusAfterPayment, type Decision } from "@/lib/admin-verification";
import type { CancelItem, PaymentItem } from "@/lib/mock-verification";
import ProofReceipt from "./ProofReceipt";
import StatusChip from "./StatusChip";

export type PayDecision = { result: Decision; reason?: string };
export type CancelDecisionRecord = { result: Decision; note: string; refund: number | null };

const CARD = "box-border min-w-0 rounded-[40px] border-[1.5px] border-line bg-white p-8 shadow-[0_24px_48px_rgba(8,44,28,.1)]";
const ROW = "flex justify-between gap-3 border-b border-line py-3";

type ActionProps = { label: string; onClick: () => void; tone: "green" | "red" | "dark"; check?: boolean };
function Action({ label, onClick, tone, check }: ActionProps) {
  const cls = tone === "green" ? "border-0 bg-f5 text-white" : tone === "red" ? "border-[1.5px] border-[#B42328] bg-white text-[#B42328]" : "border-[1.5px] border-f9 bg-white text-f9";
  return (
    <button type="button" onClick={onClick} className={`btn flex h-[54px] cursor-pointer items-center gap-2.5 rounded-full px-7 text-base font-bold ${cls}`}>
      {check && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C6F432" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>}
      {label}
    </button>
  );
}

type PayProps = { item: PaymentItem; decision?: PayDecision; onView: () => void; onApprove: () => void; onReject: () => void };

export function PaymentDetail({ item, decision, onView, onApprove, onReject }: PayProps) {
  const status = decision ? statusAfterPayment(decision.result) : "menunggu_verifikasi";
  const rows: [string, string][] = [
    ["Penyewa", item.penyewa], ["Kontak", item.kontak], ["Lapangan", item.courtName], ["Tanggal", dateLong(item.date)],
    ["Jam", rangeLabel(item.hours[0], item.hours[item.hours.length - 1] + 1)], ["Diunggah", createdLabel(item.uploadedAtMs)],
  ];
  return (
    <section aria-label="Detail verifikasi" className={`${CARD} flex-[2_1_520px]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[28px] font-bold tracking-[-0.03em]">{item.kode}</h2>
        <StatusChip status={status} className="!px-4 !py-[7px] !text-[13px]" />
      </div>

      <div className="mt-6 flex flex-wrap gap-6">
        <div className="max-w-[300px] flex-[1_1_220px]">
          <ProofReceipt item={item} />
        </div>
        <dl className="m-0 grid flex-[1_1_260px] content-start text-[15px]">
          {rows.map(([k, v]) => (
            <div key={k} className={ROW}><dt className="font-medium text-muted">{k}</dt><dd className="m-0 text-right font-bold">{v}</dd></div>
          ))}
          <div className="flex items-center justify-between gap-3 pt-3.5">
            <dt className="font-bold">Total</dt>
            <dd className="m-0 font-display text-xl font-bold text-f5">{fmtRupiah(item.total)}</dd>
          </div>
        </dl>
      </div>

      {!decision ? (
        <>
          <Banner tone="amber" icon="alert" role="note" className="mt-6 !rounded-[22px] !px-5 !py-4 !text-sm">
            Cocokkan nominal dengan mutasi rekening sebelum menyetujui.
          </Banner>
          <div className="mt-[22px] flex flex-wrap gap-3">
            <Action label="Lihat bukti" tone="dark" onClick={onView} />
            <Action label="Setujui" tone="green" check onClick={onApprove} />
            <Action label="Tolak" tone="red" onClick={onReject} />
          </div>
        </>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div
            role="status"
            className={`min-w-0 flex-1 rounded-[22px] px-[22px] py-[18px] text-[15px] font-bold leading-[1.6] ${decision.result === "approved" ? "bg-f1 text-f6" : "bg-[#FDE4E5] text-[#B42328]"}`}
          >
            {decision.result === "approved"
              ? "Pembayaran disetujui. Pesanan terkonfirmasi."
              : <>Bukti ditolak. Penyewa harus memesan ulang.<span className="mt-1 block text-sm font-medium">Alasan: {decision.reason}</span></>}
          </div>
          <Action label="Lihat bukti" tone="dark" onClick={onView} />
        </div>
      )}
    </section>
  );
}

type CancelProps = { item: CancelItem; decision?: CancelDecisionRecord; onApprove: () => void; onReject: () => void };

export function CancelDetail({ item, decision, onApprove, onReject }: CancelProps) {
  const status = decision ? statusAfterCancellation(decision.result) : "pengajuan_pembatalan";
  const rows: [string, string][] = [
    ["Pemesan", item.pemesan], ["Kontak", item.kontak], ["Alasan", item.alasan],
    ["Bank tujuan refund", item.refund.bank], ["Nomor rekening", item.refund.rekening], ["Atas nama", item.refund.atasNama],
    ["Diajukan", createdLabel(item.diajukanAtMs)],
  ];
  return (
    <section aria-label="Detail pembatalan" className={`${CARD} flex-[2_1_460px]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[26px] font-bold tracking-[-0.03em]">{item.kode}</h2>
        <StatusChip status={status} className="!px-4 !py-[7px] !text-[13px]" />
      </div>
      <p className="mt-3 text-[15px] leading-[1.6] text-muted">
        {item.pemesan} · {item.courtName} · {dateLong(item.date)} · {rangeLabel(item.hours[0], item.hours[item.hours.length - 1] + 1)}.
        Total dibayar <b className="text-f9">{fmtRupiah(item.total)}</b>.
      </p>
      <dl className="mt-5 grid grid-cols-[150px_1fr] gap-x-3.5 gap-y-2.5 rounded-3xl border border-line bg-f0 px-5 py-[18px] text-sm m:grid-cols-1 m:gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-semibold text-muted m:mt-2">{k}</dt>
            <dd className="m-0 break-words font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      {!decision ? (
        <div className="mt-[22px] flex flex-wrap gap-3">
          <Action label="Setujui pembatalan" tone="green" onClick={onApprove} />
          <Action label="Tolak pembatalan" tone="red" onClick={onReject} />
        </div>
      ) : (
        <div
          role="status"
          className={`mt-[22px] rounded-[22px] px-5 py-4 text-[15px] font-bold leading-[1.6] ${decision.result === "approved" ? "bg-[#E3EAE6] text-[#3F5247]" : "bg-f1 text-f6"}`}
        >
          {decision.result === "approved"
            ? <>Pembatalan disetujui. Pesanan dibatalkan dan slot dilepas.{" "}
                {decision.refund ? `Refund ${fmtRupiah(decision.refund)} dicatat, dikirim manual ke rekening penyewa.` : "Tanpa refund."}</>
            : "Pembatalan ditolak. Pesanan tetap terkonfirmasi."}
          <span className="mt-1 block text-sm font-medium">Catatan: {decision.note}</span>
        </div>
      )}
    </section>
  );
}
