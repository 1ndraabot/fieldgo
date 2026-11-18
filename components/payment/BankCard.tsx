"use client";

import { useEffect, useRef, useState } from "react";

type Props = { bankName: string; accountName: string; accountNumber: string; total: string; disabled?: boolean };

const group = (n: string) => n.replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

/** Kartu gelap rekening tujuan + total transfer, dengan tombol salin nomor rekening. */
export default function BankCard({ bankName, accountName, accountNumber, total, disabled = false }: Props) {
  const [copy, setCopy] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    let ok = true;
    try { await navigator.clipboard.writeText(accountNumber); } catch { ok = false; }
    setCopy(ok ? "ok" : "fail");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopy("idle"), 1800);
  };

  return (
    <div className={`relative overflow-hidden rounded-[40px] bg-f9 p-8 text-white ${disabled ? "opacity-60" : ""}`} aria-disabled={disabled || undefined}>
      <div aria-hidden="true" className="absolute right-[-60px] top-[-80px] h-[300px] w-[300px] rounded-full bg-lime opacity-30 blur-[80px]" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-sm font-semibold text-white/80">Transfer ke</div>
          <div className="mt-1.5 text-lg font-bold">{bankName} · a.n. {accountName}</div>
          <div className="mt-3.5 font-display text-[clamp(30px,3.6vw,44px)] font-bold tracking-[.02em] text-lime">{group(accountNumber)}</div>
        </div>
        <button
          type="button" onClick={onCopy} disabled={disabled}
          className={`btn flex h-[52px] cursor-pointer items-center gap-2.5 rounded-full border-[1.5px] border-white/45 px-6 text-[15px] font-bold ${
            copy === "ok" ? "bg-lime text-f9" : "bg-transparent text-white"
          }`}
        >
          {copy === "ok" ? "Tersalin" : copy === "fail" ? "Gagal menyalin" : "Salin nomor rekening"}
        </button>
      </div>
      <span role="status" className="sr-only">{copy === "ok" ? "Nomor rekening tersalin" : copy === "fail" ? "Nomor rekening gagal disalin" : ""}</span>
      <div className="relative mt-[26px] border-t border-white/15 pt-[22px]">
        <div className="text-sm font-semibold text-white/80">Total yang harus ditransfer</div>
        <div className="mt-1.5 font-display text-[clamp(40px,5vw,60px)] font-extrabold tracking-[-0.04em]">{total}</div>
      </div>
    </div>
  );
}
