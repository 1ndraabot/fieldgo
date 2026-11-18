import type { ReactNode } from "react";

/** Keadaan kosong (desain .empty): kotak putus-putus dengan ikon lingkaran. */
export default function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] border-[1.5px] border-dashed border-[#86E3AE] bg-f0 px-6 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-f1">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E8A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
      <h3 className="font-display text-xl font-bold tracking-[-0.02em]">{title}</h3>
      {children && <p className="max-w-[360px] text-[15px] leading-[1.6] text-muted">{children}</p>}
    </div>
  );
}
