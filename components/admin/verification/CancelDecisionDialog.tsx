"use client";

import { useRef, useState } from "react";
import Banner from "@/components/booking/Banner";
import DialogShell from "@/components/ui/DialogShell";
import FormField, { inputClass, textareaClass } from "@/components/ui/FormField";
import { TEXT_MAX, parseRefund, validateCancelDecision, type CancelErrors, type Decision } from "@/lib/admin-verification";
import { fmtRupiah } from "@/lib/data";
import type { CancelItem } from "@/lib/mock-verification";

type Props = {
  item: CancelItem;
  mode: Decision;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (d: { note: string; refund: number | null }) => void;
};

const BTN = "btn inline-flex h-[50px] cursor-pointer items-center justify-center rounded-full px-6 text-[15px] font-bold";

/** Keputusan pembatalan. Setujui: nominal refund manual (opsional) + catatan; Tolak: catatan saja. Catatan wajib. */
export default function CancelDecisionDialog({ item, mode, busy, error, onClose, onConfirm }: Props) {
  const approve = mode === "approved";
  const [refund, setRefund] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<CancelErrors>({});
  const refundRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const e = validateCancelDecision({ result: mode, note, refundInput: refund, maxRefund: item.total });
    setErrors(e);
    if (e.refund) return refundRef.current?.focus();
    if (e.note) return noteRef.current?.focus();
    const r = approve ? parseRefund(refund, item.total) : null;
    onConfirm({ note: note.trim(), refund: r && r.ok ? r.amount : null });
  };

  return (
    <DialogShell titleId="cd-t" title={approve ? "Setujui pembatalan" : "Tolak pembatalan"} onClose={onClose} locked={busy}>
      <p className="-mt-2 text-[15px] leading-[1.6] text-muted">{item.kode} · {item.pemesan} · Total dibayar <b className="text-f9">{fmtRupiah(item.total)}</b></p>

      {approve && (
        <FormField id="rf" label="Jumlah refund (Rp)" error={errors.refund} hint="Kosongkan bila tidak ada refund. Maksimal sebesar total dibayar. Transfer dilakukan di luar sistem.">
          <input
            ref={refundRef} id="rf" type="text" inputMode="numeric" autoComplete="off" value={refund} readOnly={busy}
            onChange={(e) => { setRefund(e.target.value); if (errors.refund) setErrors((p) => ({ ...p, refund: undefined })); }}
            aria-invalid={errors.refund ? true : undefined} aria-describedby="rf-msg" placeholder="Contoh: 85000"
            className={inputClass(!!errors.refund)}
          />
        </FormField>
      )}

      <FormField id="nt" label="Catatan keputusan (wajib)" error={errors.note} hint="Alasan persetujuan atau penolakan, dilihat penyewa.">
        <textarea
          ref={noteRef} id="nt" rows={3} maxLength={TEXT_MAX + 50} value={note} readOnly={busy}
          onChange={(e) => { setNote(e.target.value); if (errors.note) setErrors((p) => ({ ...p, note: undefined })); }}
          aria-invalid={errors.note ? true : undefined} aria-describedby="nt-msg"
          className={textareaClass(!!errors.note)}
        />
      </FormField>

      <Banner tone={approve ? "amber" : "teal"} icon="info" className="!text-sm">
        {approve
          ? <>Pesanan menjadi <b>Dibatalkan</b> dan slot dilepas.</>
          : <>Pesanan kembali <b>Terkonfirmasi</b> dan slot tetap terisi. Penyewa tidak dapat mengajukan lagi untuk pesanan ini.</>}
      </Banner>
      {error && <Banner tone="red" role="alert">{error}</Banner>}

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className={`${BTN} border-[1.5px] border-f9 bg-white`}>Kembali</button>
        <button type="button" onClick={submit} disabled={busy} className={`${BTN} ${approve ? "border-0 bg-f5 text-white" : "border-0 bg-[#B42328] text-white"}`}>
          {busy ? "Menyimpan…" : approve ? "Setujui pembatalan" : "Tolak pembatalan"}
        </button>
      </div>
    </DialogShell>
  );
}
