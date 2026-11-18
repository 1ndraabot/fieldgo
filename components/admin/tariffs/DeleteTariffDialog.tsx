"use client";

import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";
import { fmtRupiah } from "@/lib/data";
import { rangeText, type DayType, type TariffRow } from "@/lib/admin-tariffs";

type Props = { tipe: DayType; title: string; row: TariffRow; onConfirm: () => void; onClose: () => void };

/** Konfirmasi hapus rentang tarif. Rentang dihapus dari draf; berlaku setelah "Simpan tarif". */
export default function DeleteTariffDialog({ tipe, title, row, onConfirm, onClose }: Props) {
  const complete = /^\d+$/.test(row.start) && /^\d+$/.test(row.end);
  const price = /^\d+$/.test(row.price.trim()) && Number(row.price) > 0 ? ` · ${fmtRupiah(Number(row.price))} per jam` : "";
  return (
    <DialogShell titleId="dt-t" title="Hapus rentang tarif?" onClose={onClose}>
      <p className="text-[15px] leading-[1.6] text-muted">
        <b className="text-f9">{title} ({tipe})</b>{complete ? <> · <b className="text-f9">{rangeText(Number(row.start), Number(row.end))}</b></> : null}{price}
      </p>
      <p className="text-[15px] leading-[1.6] text-muted">
        Rentang ini dihapus dari daftar dan baru berlaku setelah kamu menekan <b className="text-f9">Simpan tarif</b>. Jam yang tidak lagi tertutup tarif tidak bisa dipesan.
        Pesanan yang sudah dibuat tetap memakai harga yang dikunci.
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>Hapus rentang</Button>
      </div>
    </DialogShell>
  );
}
