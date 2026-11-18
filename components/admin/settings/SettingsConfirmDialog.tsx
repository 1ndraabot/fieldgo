"use client";

import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";

type Props = { changes: string[]; accountChanged: boolean; busy: boolean; error: string | null; onConfirm: () => void; onClose: () => void };

/** Konfirmasi sebelum menyimpan: daftar perubahan; peringatan ekstra bila rekening tujuan berubah. */
export default function SettingsConfirmDialog({ changes, accountChanged, busy, error, onConfirm, onClose }: Props) {
  return (
    <DialogShell titleId="cs-t" title="Simpan pengaturan?" onClose={onClose} locked={busy}>
      <ul className="m-0 flex list-none flex-col gap-1.5 rounded-3xl bg-f0 p-[18px] text-[15px] font-bold">
        {changes.map((c) => <li key={c} className="break-words">{c}</li>)}
      </ul>
      {accountChanged && (
        <Banner tone="amber" icon="alert" className="!text-sm">
          Penyewa akan diminta mentransfer ke rekening ini. Pastikan nama bank, nomor rekening, dan nama pemilik sudah benar.
        </Banner>
      )}
      <p className="text-[13px] leading-[1.6] text-muted">Perubahan berlaku untuk pesanan baru.</p>
      {error && <Banner tone="red" role="alert">{error}</Banner>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>Kembali</Button>
        <Button size="sm" onClick={onConfirm} disabled={busy}>{busy ? "Menyimpan…" : "Simpan pengaturan"}</Button>
      </div>
    </DialogShell>
  );
}
