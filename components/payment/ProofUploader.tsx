"use client";

import { useRef, useState, type DragEvent } from "react";
import { PROOF_ACCEPT, formatBytes } from "@/lib/proof-file";
import type { Proof } from "./useProofFile";

type Props = {
  proof: Proof | null;
  error: string | null;
  checking: boolean;
  /** true bila pesanan tidak lagi menerima unggahan (sudah dikirim / dibatalkan / kedaluwarsa) */
  locked: boolean;
  /** true bila bukti sudah dikirim (pratinjau tetap tampil, tanpa tombol ganti) */
  sent: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
};

const CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

/** Area unggah + pratinjau. Berkas hanya dibaca di browser; tidak ada yang dikirim ke server. */
export default function ProofUploader({ proof, error, checking, locked, sent, onPick, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (f?: File | null) => { if (f && !locked) onPick(f); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files?.[0]); };

  return (
    <div>
      <h2 className="mb-[18px] mt-4 font-display text-[28px] font-bold tracking-[-0.03em]">Unggah bukti transfer</h2>
      <div className="flex flex-wrap gap-5">
        <div className="relative flex-[1_1_280px]">
          <input
            ref={input} id="bukti" type="file" accept={PROOF_ACCEPT} disabled={locked}
            aria-describedby="bukti-h bukti-e"
            onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; /* izinkan memilih berkas yang sama lagi */ }}
            className="absolute h-px w-px opacity-0"
          />
          <label
            htmlFor="bukti"
            onDragOver={(e) => { e.preventDefault(); if (!locked) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[32px] border-2 border-dashed p-6 text-center transition-colors duration-[180ms] motion-reduce:transition-none ${
              locked
                ? "cursor-not-allowed border-[#C9D6CE] bg-[#F4F7F5] opacity-60"
                : `cursor-pointer border-f4 hover:bg-f1 ${dragging ? "bg-f1" : "bg-f0"}`
            }`}
          >
            <span className={`flex h-16 w-16 items-center justify-center rounded-full ${locked ? "bg-[#8CA095]" : "bg-f5"}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C6F432" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
            </span>
            <span className="text-[17px] font-bold">
              {checking ? "Memeriksa berkas…" : locked ? (sent ? "Bukti sudah dikirim" : "Unggah tidak tersedia") : proof ? "Pilih berkas lain" : "Pilih berkas bukti"}
            </span>
            <span className="text-sm font-medium text-muted">
              {locked ? "Bukti tidak dapat diganti" : "JPG, PNG, atau PDF · maks 5 MB"}
            </span>
          </label>
        </div>

        <div className="box-border min-h-[300px] flex-[1_1_280px] rounded-[32px] border-[1.5px] border-line bg-white p-[26px] shadow-[0_16px_36px_rgba(8,44,28,.1)]">
          <div className="text-xs font-bold tracking-[.06em] text-muted">PRATINJAU</div>
          {!proof ? (
            <div className="mt-3.5 text-[15px] leading-[1.6] text-muted">
              Belum ada berkas. Pilih foto atau PDF bukti transfer, pratinjau muncul di sini.
            </div>
          ) : (
            <>
              <div className="mt-3.5 flex items-center gap-2 text-[15px] font-bold text-f6">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-f5">{CHECK}</span>
                {sent ? "Bukti terkirim" : "Berkas siap dikirim"}
              </div>
              {proof.kind === "image" && proof.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URL lokal, tidak cocok untuk next/image
                <img src={proof.url} alt="Pratinjau bukti transfer" className="mt-3.5 block max-h-[200px] max-w-full rounded-[18px] border border-line object-contain" />
              ) : (
                <div className="mt-3.5 flex items-center gap-3 rounded-[18px] border border-line bg-f0 p-[18px] text-sm font-bold">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E8A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
                  Dokumen PDF
                  <span className="ml-auto rounded-full bg-f1 px-2.5 py-1 text-xs text-f6">Terpilih</span>
                </div>
              )}
              <div className="mt-3.5 break-all text-[15px] font-bold">{proof.name}</div>
              <div className="mt-1 text-sm font-medium text-muted">{formatBytes(proof.size)}</div>
              {!locked && (
                <div className="mt-3.5 flex flex-wrap gap-2.5">
                  <button type="button" onClick={() => input.current?.click()} className="h-10 cursor-pointer rounded-full border-[1.5px] border-f9 bg-white px-[18px] text-sm font-bold">Ganti berkas</button>
                  <button type="button" onClick={onClear} className="h-10 cursor-pointer rounded-full border-[1.5px] border-[#B42328] bg-white px-[18px] text-sm font-bold text-[#B42328]">Hapus</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-[18px] text-[15px] leading-[1.6] text-muted">Sebelum dikirim, pastikan nominal terlihat jelas serta nama bank dan tanggal terbaca.</p>
      <p id="bukti-h" className="mt-1.5 text-[13px] text-muted">Format JPG, JPEG, PNG, atau PDF, maksimal 5 MB.</p>
      <div id="bukti-e" aria-live="polite">
        {error && <p role="alert" className="mt-2.5 rounded-2xl bg-[#FDE4E5] px-4 py-3 text-sm font-bold text-[#B42328]">{error}</p>}
      </div>
    </div>
  );
}
