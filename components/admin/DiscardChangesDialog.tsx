"use client";

import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";

type Props = { subject: string; onStay: () => void; onDiscard: () => void };

/** Konfirmasi membuang perubahan yang belum disimpan (mis. saat pindah lapangan). Dipakai ulang di halaman admin. */
export default function DiscardChangesDialog({ subject, onStay, onDiscard }: Props) {
  return (
    <DialogShell titleId="dc-t" title="Buang perubahan?" onClose={onStay}>
      <p className="text-[15px] leading-[1.6] text-muted">
        <b className="text-f9">{subject}</b> punya perubahan yang belum disimpan. Pindah akan membuangnya.
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="sm" onClick={onStay}>Tetap di sini</Button>
        <Button variant="danger" size="sm" onClick={onDiscard}>Buang dan pindah</Button>
      </div>
    </DialogShell>
  );
}
