"use client";

import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";

type Props = { name: string; busy: boolean; error: string | null; onConfirm: () => void; onClose: () => void };

/** Konfirmasi sebelum menonaktifkan lapangan (BR-17/BR-18). */
export default function DeactivateDialog({ name, busy, error, onConfirm, onClose }: Props) {
  return (
    <DialogShell titleId="dz-t" title="Nonaktifkan lapangan?" onClose={onClose} locked={busy}>
      <p className="text-[15px] leading-[1.6] text-muted">
        <b className="text-f9">{name}</b> tidak akan tampil di daftar publik dan tidak bisa dipesan. Pesanan yang sudah berjalan tetap diproses sampai selesai,
        dan riwayat serta rekap tetap utuh. Lapangan bisa diaktifkan kembali kapan saja.
      </p>
      {error && <Banner tone="red" role="alert">{error}</Banner>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Batal</Button>
        <Button variant="danger" size="sm" onClick={onConfirm} disabled={busy}>{busy ? "Menonaktifkan…" : "Nonaktifkan lapangan"}</Button>
      </div>
    </DialogShell>
  );
}
