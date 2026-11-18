"use client";

import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";

type Props = { courtName: string; changes: string[]; activeOrders: number; busy: boolean; error: string | null; onConfirm: () => void; onClose: () => void };

/** Konfirmasi saat jam dipersempit atau hari ditutup. Pesanan yang sudah ada tidak dibatalkan otomatis. */
export default function SaveConfirmDialog({ courtName, changes, activeOrders, busy, error, onConfirm, onClose }: Props) {
  return (
    <DialogShell titleId="sc-t" title="Simpan jam yang dipersempit?" onClose={onClose} locked={busy}>
      <p className="text-[15px] leading-[1.6] text-muted">Perubahan untuk <b className="text-f9">{courtName}</b>:</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 rounded-3xl bg-f0 p-[18px] text-[15px] font-bold">
        {changes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <Banner tone="amber" icon="alert" className="!text-sm">
        Pesanan yang sudah ada tidak dibatalkan otomatis.{" "}
        {activeOrders > 0 ? <>Lapangan ini punya <b>{activeOrders} pesanan aktif</b>; periksa di halaman Pesanan.</> : "Periksa pesanan aktif di halaman Pesanan bila perlu."}
      </Banner>
      {error && <Banner tone="red" role="alert">{error}</Banner>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Kembali</Button>
        <Button size="sm" onClick={onConfirm} disabled={busy}>{busy ? "Menyimpan…" : "Simpan perubahan"}</Button>
      </div>
    </DialogShell>
  );
}
