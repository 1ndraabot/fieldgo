"use client";

import { useRef, useState } from "react";
import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";
import { IMAGE_ACCEPT } from "@/lib/image-file";
import type { CourtPhoto } from "@/lib/admin-courts";
import PhotoThumb from "./PhotoThumb";

type Props = {
  fotos: CourtPhoto[];
  utamaId: string | null;
  /** galat validasi (mis. minimal satu foto) */
  error?: string;
  /** galat saat memilih berkas (bukan gambar) */
  pickError?: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onSetMain: (id: string) => void;
};

const MINI = "h-[34px] cursor-pointer rounded-xl border-[1.5px] border-line bg-white px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40";

/** Kelola foto: pilih banyak berkas, pratinjau, hapus, urutkan, dan tentukan foto utama. Berkas hanya dibaca di browser. */
export default function PhotoManager({ fotos, utamaId, error, pickError, onAdd, onRemove, onMove, onSetMain }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const viewIndex = fotos.findIndex((f) => f.id === viewId);

  return (
    <div id="foto-section">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="text-sm font-bold">Foto lapangan</span>
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}>Unggah foto</Button>
        <input
          ref={input} type="file" multiple accept={IMAGE_ACCEPT} className="sr-only" tabIndex={-1} aria-label="Pilih foto lapangan"
          onChange={(e) => { const files = Array.from<File>(e.target.files ?? []); e.target.value = ""; if (files.length) onAdd(files); }}
        />
      </div>
      <p className="mb-3.5 mt-1.5 text-[13px] text-muted">Pilih satu atau beberapa gambar (JPG, PNG, WebP, GIF). Urutan menentukan galeri; bintang menandai foto utama.</p>

      {error && <Banner tone="red" role="alert" className="mb-3">{error}</Banner>}
      {pickError && <Banner tone="red" role="alert" className="mb-3">{pickError}</Banner>}

      {fotos.length === 0 ? (
        <div className="rounded-3xl border-[1.5px] border-dashed border-[#86E3AE] bg-f0 px-5 py-8 text-center text-[15px] font-semibold text-muted">
          Belum ada foto. Klik “Unggah foto” untuk memilih gambar.
        </div>
      ) : (
        <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5 p-0">
          {fotos.map((f, i) => {
            const main = f.id === utamaId;
            return (
              <li key={f.id}>
                <button type="button" onClick={() => setViewId(f.id)} aria-label={`Lihat foto ${i + 1}`} className="block w-full cursor-zoom-in overflow-hidden rounded-[20px] border-0 bg-transparent p-0">
                  <PhotoThumb photo={f} label={`Foto ${i + 1}`} className="h-24 w-full" />
                </button>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" aria-pressed={main} onClick={() => onSetMain(f.id)} aria-label={`Jadikan foto ${i + 1} utama`} className={`${MINI} ${main ? "!border-lime !bg-lime" : ""}`}>
                    {main ? "★ Utama" : "☆ Utama"}
                  </button>
                  <button type="button" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Geser foto ${i + 1} ke kiri`} className={MINI}>‹</button>
                  <button type="button" disabled={i === fotos.length - 1} onClick={() => onMove(i, 1)} aria-label={`Geser foto ${i + 1} ke kanan`} className={MINI}>›</button>
                  <button type="button" onClick={() => onRemove(f.id)} aria-label={`Hapus foto ${i + 1}`} className={MINI}>Hapus</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {viewIndex >= 0 && (
        <DialogShell titleId="ph-t" title={`Foto ${viewIndex + 1}${fotos[viewIndex].id === utamaId ? " (utama)" : ""}`} onClose={() => setViewId(null)} wide>
          <PhotoThumb photo={fotos[viewIndex]} label={`Pratinjau foto ${viewIndex + 1}`} className="max-h-[60vh] w-full rounded-[24px] [aspect-ratio:16/9]" />
          <p className="break-all text-sm font-medium text-muted">{fotos[viewIndex].name}</p>
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setViewId(null)}>Tutup</Button></div>
        </DialogShell>
      )}
    </div>
  );
}
