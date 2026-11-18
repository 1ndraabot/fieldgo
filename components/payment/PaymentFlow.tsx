"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Banner from "@/components/booking/Banner";
import StepIndicator from "@/components/booking/StepIndicator";
import { fmtRupiah } from "@/lib/data";
import type { PaymentOrder } from "@/lib/mock-order";
import { cancelOrder, submitProof } from "@/lib/payment-client";
import { ROUTES } from "@/lib/routes";
import BankCard from "./BankCard";
import CancelDialog from "./CancelDialog";
import DeadlineCard from "./DeadlineCard";
import PaymentSummary from "./PaymentSummary";
import ProofUploader from "./ProofUploader";
import type { PaymentStatus } from "./status";
import { useCountdown } from "./useCountdown";
import { useProofFile } from "./useProofFile";

const BTN = "btn flex h-14 cursor-pointer items-center gap-3 rounded-full px-7 text-base font-bold";

/**
 * Orkestrasi halaman Pembayaran. SEMUA interaksi hanya simulasi di browser (React state):
 * tidak ada berkas yang dikirim atau disimpan. Titik integrasi: lib/payment-client.ts.
 */
export default function PaymentFlow({ order }: { order: PaymentOrder }) {
  const [status, setStatus] = useState<PaymentStatus>("menunggu_pembayaran");
  const { proof, error: fileError, checking, pick, clear } = useProofFile();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const waiting = status === "menunggu_pembayaran";
  const remaining = useCountdown(order.deadlineMs, order.serverNowMs, waiting);

  // waktu habis tanpa bukti → kedaluwarsa (BR-09)
  useEffect(() => {
    if (waiting && remaining <= 0) { setStatus("kedaluwarsa"); setCancelOpen(false); clear(); }
  }, [waiting, remaining, clear]);

  // tampilkan hasil (sukses/dibatalkan) di layar
  useEffect(() => {
    if (status === "menunggu_verifikasi" || status === "dibatalkan") resultRef.current?.scrollIntoView({ block: "center" });
  }, [status]);

  const send = async () => {
    if (!proof || !waiting || sending) return;
    setSending(true); setSendError(null);
    try {
      await submitProof(order.kode, proof.file);
      setStatus("menunggu_verifikasi"); // countdown berhenti karena `waiting` jadi false
    } catch {
      setSendError("Bukti belum terkirim. Periksa koneksi lalu coba lagi.");
    }
    setSending(false);
  };

  const cancel = async () => {
    setCancelling(true); setCancelError(null);
    try {
      await cancelOrder(order.kode);
      setStatus("dibatalkan"); setCancelOpen(false); clear();
    } catch {
      setCancelError("Pesanan belum bisa dibatalkan. Coba lagi sebentar lagi.");
    }
    setCancelling(false);
  };

  const step = waiting ? 1 : status === "menunggu_verifikasi" ? 2 : -1;
  const uploadLocked = !waiting;

  return (
    <>
      <StepIndicator current={step} />
      <h1 className="m-0 font-display text-[clamp(36px,5vw,64px)] font-bold leading-[1.08] tracking-[-0.04em]">
        Selesaikan <span className="text-f4">pembayaran</span>
      </h1>

      <div className="mt-10 flex flex-wrap items-start gap-10">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-6">
          <DeadlineCard status={status} deadlineMs={order.deadlineMs} remaining={remaining} courtId={order.courtId} />

          <BankCard
            bankName={order.bank.name} accountName={order.bank.accountName} accountNumber={order.bank.accountNumber}
            total={fmtRupiah(order.total)} disabled={status === "dibatalkan" || status === "kedaluwarsa"}
          />

          <ProofUploader
            proof={proof} error={fileError} checking={checking}
            locked={uploadLocked} sent={status === "menunggu_verifikasi"}
            onPick={pick} onClear={clear}
          />

          {waiting && (
            <div role="note" className="flex items-center gap-3.5 rounded-3xl border-[1.5px] border-[#E5484D] bg-[#FDE4E5] px-[22px] py-[18px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B42328" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none"><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17.5v.01" /></svg>
              <span className="text-[15px] font-bold text-[#7A1519]">Bukti yang ditolak bersifat final. Anda harus memesan ulang.</span>
            </div>
          )}

          <div ref={resultRef} className="flex flex-col gap-4 scroll-mt-24">
            {sendError && <Banner tone="red" role="alert">{sendError}</Banner>}

            {status === "menunggu_verifikasi" && (
              <div role="status" className="rounded-3xl border-[1.5px] border-f4 bg-f1 px-[22px] py-[18px] text-[15px] font-bold leading-[1.6] text-[#07522B]">
                Bukti terkirim. Admin akan memeriksa pembayaran Anda; kabar masuk lewat notifikasi dan halaman Riwayat.{" "}
                <Link href={ROUTES.history} className="underline">Lihat riwayat</Link>
                <span className="mt-1 block text-sm font-medium text-muted">Simulasi: bukti hanya dipilih di browser ini dan belum disimpan ke server.</span>
              </div>
            )}
            {status === "dibatalkan" && (
              <div role="status" className="rounded-3xl border-[1.5px] border-[#C9D6CE] bg-[#E3EAE6] px-[22px] py-[18px] text-[15px] font-bold leading-[1.6] text-[#3F5247]">
                Pesanan {order.kode} telah dibatalkan. Pembayaran dan unggah bukti tidak tersedia lagi.
                <span className="mt-1 block text-sm font-medium text-muted">Simulasi: pembatalan hanya terjadi di browser ini dan belum tercatat di server.</span>
              </div>
            )}
            {status === "kedaluwarsa" && (
              <Banner tone="red" role="status">Batas bayar terlewati sebelum bukti dikirim, jadi pesanan kedaluwarsa. Pesan ulang untuk memilih slot lagi.</Banner>
            )}

            <div className="flex flex-wrap gap-3">
              {waiting && (
                <>
                  <button type="button" onClick={send} disabled={!proof || sending || checking} className={`${BTN} border-0 bg-f5 text-white`}>
                    {sending ? "Mengirim bukti…" : "Kirim bukti"}
                  </button>
                  <button type="button" onClick={() => { setCancelError(null); setCancelOpen(true); }} disabled={sending} className={`${BTN} border-[1.5px] border-[#B42328] bg-white text-[#B42328]`}>
                    Batalkan pesanan
                  </button>
                </>
              )}
              {status === "menunggu_verifikasi" && (
                <Link href={ROUTES.history} className={`${BTN} border-0 bg-f5 text-white`}>Lihat riwayat</Link>
              )}
              {(status === "dibatalkan" || status === "kedaluwarsa") && (
                <>
                  <Link href={ROUTES.court(order.courtId)} className={`${BTN} border-0 bg-f5 text-white`}>Pesan ulang</Link>
                  <Link href={ROUTES.history} className={`${BTN} border-[1.5px] border-f9 text-f9`}>Lihat riwayat</Link>
                </>
              )}
            </div>
            <p className="text-[13px] leading-[1.6] text-muted">
              Mode demo: data pesanan contoh, dan unggahan atau pembatalan hanya disimulasikan di browser ini. Tidak ada yang dikirim atau disimpan.
            </p>
          </div>
        </div>

        <PaymentSummary order={order} status={status} />
      </div>

      {cancelOpen && (
        <CancelDialog order={order} cancelling={cancelling} error={cancelError} onConfirm={cancel} onClose={() => setCancelOpen(false)} />
      )}
    </>
  );
}
