"use client";

import { useRef, useState } from "react";
import Banner from "@/components/booking/Banner";
import DialogShell from "@/components/ui/DialogShell";
import FormField, { textareaClass } from "@/components/ui/FormField";
import { TEXT_MAX, validateRejectReason } from "@/lib/admin-verification";
import { fmtRupiah } from "@/lib/data";
import type { PaymentItem } from "@/lib/mock-verification";

type Common = { item: PaymentItem; busy: boolean; error: string | null; onClose: () => void };
const BTN = "btn inline-flex h-[50px] cursor-pointer items-center justify-center rounded-full px-6 text-[15px] font-bold";

/** Konfirmasi persetujuan bukti → pesanan Terkonfirmasi. */
export function ApprovePaymentDialog({ item, busy, error, onClose, onConfirm }: Common & { onConfirm: () => void }) {
  return (
    <DialogShell titleId="ap-t" title="Setujui pembayaran?" onClose={onClose} locked={busy}>
      <dl className="m-0 grid gap-2.5 text-[15px]">
        {[["Kode", item.kode], ["Penyewa", item.penyewa], ["Total", fmtRupiah(item.total)]].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="font-medium text-muted">{k}</dt><dd className="m-0 font-bold">{v}</dd></div>
        ))}
      </dl>
      <Banner tone="amber" icon="alert" className="!text-sm">
        Pastikan nominal {fmtRupiah(item.total)} sudah masuk di mutasi rekening. Pesanan menjadi <b>Terkonfirmasi</b> dan slot tetap terisi.
      </Banner>
      {error && <Banner tone="red" role="alert">{error}</Banner>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={`${BTN} border-[1.5px] border-f9 bg-white`}>Kembali</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={`${BTN} border-0 bg-f5 text-white`}>{busy ? "Menyetujui…" : "Setujui pembayaran"}</button>
      </div>
    </DialogShell>
  );
}

/** Penolakan bukti: alasan wajib; keputusan final (BR-11). */
export function RejectPaymentDialog({ item, busy, error, onClose, onConfirm }: Common & { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const e = validateRejectReason(reason);
    setErr(e);
    if (e) return ref.current?.focus();
    onConfirm(reason.trim());
  };

  return (
    <DialogShell titleId="rp-t" title="Tolak bukti pembayaran" onClose={onClose} locked={busy}>
      <p className="-mt-2 text-[15px] leading-[1.6] text-muted">{item.kode} · {item.penyewa} · {fmtRupiah(item.total)}</p>
      <FormField id="alasan" label="Alasan penolakan (wajib)" error={err ?? undefined} hint="Alasan dilihat penyewa.">
        <textarea
          ref={ref} id="alasan" rows={3} maxLength={TEXT_MAX + 50} value={reason} readOnly={busy}
          onChange={(e) => { setReason(e.target.value); if (err) setErr(null); }}
          aria-invalid={err ? true : undefined} aria-describedby="alasan-msg"
          placeholder="Contoh: nominal pada bukti tidak sesuai total pesanan."
          className={textareaClass(!!err)}
        />
      </FormField>
      <Banner tone="red" icon="alert" className="!text-sm">Penolakan bersifat final. Slot dilepas dan penyewa harus memesan ulang.</Banner>
      {error && <Banner tone="red" role="alert">{error}</Banner>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={`${BTN} border-[1.5px] border-f9 bg-white`}>Kembali</button>
        <button type="button" onClick={submit} disabled={busy} className={`${BTN} border-0 bg-[#B42328] text-white`}>{busy ? "Menolak…" : "Tolak bukti"}</button>
      </div>
    </DialogShell>
  );
}
