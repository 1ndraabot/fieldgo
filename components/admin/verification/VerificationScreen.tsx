"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Banner from "@/components/booking/Banner";
import AdminShell from "@/components/admin/AdminShell";
import EmptyState from "@/components/ui/EmptyState";
import { decideCancellation, decidePayment } from "@/lib/admin-verification-client";
import { statusAfterCancellation, statusAfterPayment, type Decision } from "@/lib/admin-verification";
import { fmtRupiah } from "@/lib/data";
import type { VerificationData } from "@/lib/mock-verification";
import CancelDecisionDialog from "./CancelDecisionDialog";
import { CancelDetail, PaymentDetail, type CancelDecisionRecord, type PayDecision } from "./Details";
import { ApprovePaymentDialog, RejectPaymentDialog } from "./PaymentDialogs";
import ProofModal from "./ProofModal";
import { CancelCard, PaymentCard, QueueColumn } from "./Queue";

type Tab = "bukti" | "batal";
type Dialog =
  | { type: "proof" | "approve-pay" | "reject-pay"; kode: string }
  | { type: "decide-cancel"; kode: string; mode: Decision };

type Props = { data: VerificationData; nowMs: number; failOnce: boolean };

const SAVE_ERROR = "Keputusan belum tersimpan. Periksa koneksi lalu coba lagi.";

/**
 * Orkestrasi halaman Admin — Verifikasi. SEMUA keputusan hanya simulasi di browser (React state):
 * tidak ada yang dikirim atau disimpan. Titik integrasi: lib/admin-verification-client.ts.
 */
export default function VerificationScreen({ data, nowMs, failOnce }: Props) {
  const [tab, setTab] = useState<Tab>("bukti");
  const [payDecisions, setPayDecisions] = useState<Record<string, PayDecision>>({});
  const [cancelDecisions, setCancelDecisions] = useState<Record<string, CancelDecisionRecord>>({});
  const [selPay, setSelPay] = useState<string | null>(null);
  const [selCancel, setSelCancel] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const failed = useRef(new Set<string>());

  const { payments, cancellations } = data;
  const pendingPay = payments.filter((p) => !payDecisions[p.kode]);
  const decidedPay = payments.filter((p) => payDecisions[p.kode]);
  const pendingCancel = cancellations.filter((c) => !cancelDecisions[c.kode]);
  const decidedCancel = cancellations.filter((c) => cancelDecisions[c.kode]);

  const curPay = payments.find((p) => p.kode === selPay) ?? pendingPay[0] ?? decidedPay[0] ?? null;
  const curCancel = cancellations.find((c) => c.kode === selCancel) ?? pendingCancel[0] ?? decidedCancel[0] ?? null;
  const totalPending = pendingPay.length + pendingCancel.length;

  /** Simulasi gagal sekali per pesanan bila ?simulasi=gagal — untuk mencoba tampilan galat. */
  const shouldFail = (kode: string) => {
    if (!failOnce || failed.current.has(kode)) return false;
    failed.current.add(kode);
    return true;
  };
  const closeDialog = () => { if (!busy) { setDialog(null); setDialogError(null); } };
  const open = (d: Dialog) => { setDialogError(null); setDialog(d); };

  const payAction = async (kode: string, d: PayDecision) => {
    setBusy(true); setDialogError(null);
    try {
      await decidePayment(kode, d, { fail: shouldFail(kode) });
      setPayDecisions((p) => ({ ...p, [kode]: d }));
      setSelPay(pendingPay.find((p) => p.kode !== kode)?.kode ?? kode);
      setDialog(null);
      setFeedback(d.result === "approved"
        ? `Pembayaran ${kode} disetujui. Status pesanan: ${label(statusAfterPayment("approved"))}.`
        : `Bukti ${kode} ditolak. Status pesanan: ${label(statusAfterPayment("rejected"))}. Penyewa harus memesan ulang.`);
    } catch { setDialogError(SAVE_ERROR); }
    setBusy(false);
  };

  const cancelAction = async (kode: string, d: CancelDecisionRecord) => {
    setBusy(true); setDialogError(null);
    try {
      await decideCancellation(kode, d, { fail: shouldFail(kode) });
      setCancelDecisions((p) => ({ ...p, [kode]: d }));
      setSelCancel(pendingCancel.find((c) => c.kode !== kode)?.kode ?? kode);
      setDialog(null);
      setFeedback(d.result === "approved"
        ? `Pembatalan ${kode} disetujui. Status pesanan: ${label(statusAfterCancellation("approved"))}.${d.refund ? ` Refund ${fmtRupiah(d.refund)} dicatat.` : " Tanpa refund."}`
        : `Pembatalan ${kode} ditolak. Pesanan kembali ${label(statusAfterCancellation("rejected"))}.`);
    } catch { setDialogError(SAVE_ERROR); }
    setBusy(false);
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setTab((t) => (t === "bukti" ? "batal" : "bukti"));
    setFeedback(null);
    document.getElementById(tab === "bukti" ? "tab-batal" : "tab-bukti")?.focus();
  };
  const tabCls = (on: boolean) =>
    `h-[46px] cursor-pointer rounded-full border-[1.5px] px-6 text-[15px] font-bold ${on ? "border-f9 bg-f9 text-white" : "border-line bg-white text-f9"}`;

  const dPay = dialog && "kode" in dialog ? payments.find((p) => p.kode === dialog.kode) : undefined;
  const dCancel = dialog && "kode" in dialog ? cancellations.find((c) => c.kode === dialog.kode) : undefined;

  return (
    <AdminShell active="Verifikasi" badge={totalPending}>
      <h1 className="font-display text-[clamp(34px,4vw,48px)] font-bold tracking-[-0.04em]">Verifikasi</h1>
      <p className="mt-2 text-[13px] leading-[1.6] text-muted">
        Mode demo: data contoh. Keputusan hanya disimulasikan di browser ini dan tidak disimpan.
      </p>

      <div role="tablist" aria-label="Jenis verifikasi" onKeyDown={onTabKey} className="mt-6 flex flex-wrap gap-2.5">
        <button id="tab-bukti" type="button" role="tab" aria-selected={tab === "bukti"} aria-controls="panel-bukti" tabIndex={tab === "bukti" ? 0 : -1}
          onClick={() => { setTab("bukti"); setFeedback(null); }} className={tabCls(tab === "bukti")}>
          Bukti pembayaran · {pendingPay.length}
        </button>
        <button id="tab-batal" type="button" role="tab" aria-selected={tab === "batal"} aria-controls="panel-batal" tabIndex={tab === "batal" ? 0 : -1}
          onClick={() => { setTab("batal"); setFeedback(null); }} className={tabCls(tab === "batal")}>
          Pembatalan · {pendingCancel.length}
        </button>
      </div>

      {feedback && (
        <Banner tone="green" role="status" icon="check" className="mt-6">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer rounded-full border-[1.5px] border-current bg-transparent px-3.5 py-1 text-[13px] font-bold">Tutup</button>
          </span>
        </Banner>
      )}

      {tab === "bukti" && (
        <div id="panel-bukti" role="tabpanel" aria-labelledby="tab-bukti" className="mt-7 flex flex-wrap items-start gap-6">
          {payments.length === 0 ? (
            <div className="w-full"><EmptyState title="Belum ada bukti pembayaran">Bukti yang diunggah penyewa muncul di sini.</EmptyState></div>
          ) : (
            <>
              <QueueColumn
                className="max-w-[440px] flex-[1_1_320px]" ariaLabel="Antrean" label="ANTREAN, TERLAMA DULU"
                emptyTitle="Antrean kosong" emptyText="Tidak ada bukti yang menunggu verifikasi. Kerja bagus."
                pending={pendingPay.map((p) => (
                  <PaymentCard key={p.kode} item={p} status="menunggu_verifikasi" active={curPay?.kode === p.kode} nowMs={nowMs} onClick={() => setSelPay(p.kode)} />
                ))}
                decided={decidedPay.map((p) => (
                  <PaymentCard key={p.kode} item={p} status={statusAfterPayment(payDecisions[p.kode].result)} active={curPay?.kode === p.kode} nowMs={nowMs} onClick={() => setSelPay(p.kode)} />
                ))}
              />
              {curPay && (
                <PaymentDetail
                  item={curPay} decision={payDecisions[curPay.kode]}
                  onView={() => open({ type: "proof", kode: curPay.kode })}
                  onApprove={() => open({ type: "approve-pay", kode: curPay.kode })}
                  onReject={() => open({ type: "reject-pay", kode: curPay.kode })}
                />
              )}
            </>
          )}
        </div>
      )}

      {tab === "batal" && (
        <div id="panel-batal" role="tabpanel" aria-labelledby="tab-batal" className="mt-7 flex flex-wrap items-start gap-6">
          {cancellations.length === 0 ? (
            <div className="w-full"><EmptyState title="Belum ada pengajuan pembatalan">Pengajuan dari penyewa muncul di sini.</EmptyState></div>
          ) : (
            <>
              <QueueColumn
                className="max-w-[400px] flex-[1_1_300px]" ariaLabel="Pengajuan pembatalan" label="PENGAJUAN, TERLAMA DULU"
                emptyTitle="Antrean kosong" emptyText="Tidak ada pengajuan pembatalan yang menunggu keputusan."
                pending={pendingCancel.map((c) => (
                  <CancelCard key={c.kode} item={c} status="pengajuan_pembatalan" active={curCancel?.kode === c.kode} onClick={() => setSelCancel(c.kode)} />
                ))}
                decided={decidedCancel.map((c) => (
                  <CancelCard key={c.kode} item={c} status={statusAfterCancellation(cancelDecisions[c.kode].result)} active={curCancel?.kode === c.kode} onClick={() => setSelCancel(c.kode)} />
                ))}
              />
              {curCancel && (
                <CancelDetail
                  item={curCancel} decision={cancelDecisions[curCancel.kode]}
                  onApprove={() => open({ type: "decide-cancel", kode: curCancel.kode, mode: "approved" })}
                  onReject={() => open({ type: "decide-cancel", kode: curCancel.kode, mode: "rejected" })}
                />
              )}
            </>
          )}
        </div>
      )}

      {dialog?.type === "proof" && dPay && (
        <ProofModal
          item={dPay} onClose={closeDialog}
          onApprove={payDecisions[dPay.kode] ? undefined : () => open({ type: "approve-pay", kode: dPay.kode })}
          onReject={payDecisions[dPay.kode] ? undefined : () => open({ type: "reject-pay", kode: dPay.kode })}
        />
      )}
      {dialog?.type === "approve-pay" && dPay && (
        <ApprovePaymentDialog item={dPay} busy={busy} error={dialogError} onClose={closeDialog} onConfirm={() => payAction(dPay.kode, { result: "approved" })} />
      )}
      {dialog?.type === "reject-pay" && dPay && (
        <RejectPaymentDialog item={dPay} busy={busy} error={dialogError} onClose={closeDialog} onConfirm={(reason) => payAction(dPay.kode, { result: "rejected", reason })} />
      )}
      {dialog?.type === "decide-cancel" && dCancel && (
        <CancelDecisionDialog
          key={`${dCancel.kode}-${dialog.mode}`} item={dCancel} mode={dialog.mode} busy={busy} error={dialogError} onClose={closeDialog}
          onConfirm={({ note, refund }) => cancelAction(dCancel.kode, { result: dialog.mode, note, refund })}
        />
      )}
    </AdminShell>
  );
}

const LABELS = { terkonfirmasi: "Terkonfirmasi", ditolak: "Ditolak", dibatalkan: "Dibatalkan", menunggu_verifikasi: "Menunggu verifikasi", pengajuan_pembatalan: "Pengajuan pembatalan" } as const;
const label = (s: keyof typeof LABELS) => LABELS[s];
