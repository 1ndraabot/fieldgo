"use client";

import type { ReactNode } from "react";
import { useDialog } from "./useDialog";

type Props = {
  titleId: string;
  title: string;
  onClose: () => void;
  /** kunci penutupan (Escape/klik latar) saat proses berjalan */
  locked?: boolean;
  wide?: boolean;
  children: ReactNode;
};

/** Cangkang dialog modal: latar gelap, fokus terkurung, Escape menutup. */
export default function DialogShell({ titleId, title, onClose, locked = false, wide = false, children }: Props) {
  const ref = useDialog<HTMLDivElement>(onClose, locked);
  return (
    <div onClick={() => !locked && onClose()} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(7,34,24,.55)] p-6 backdrop-blur-[3px]">
      <div
        ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}
        className={`my-auto flex w-full flex-col gap-[18px] rounded-[32px] bg-white p-8 shadow-[0_40px_80px_rgba(0,0,0,.35)] ${wide ? "max-w-[640px]" : "max-w-[520px]"}`}
      >
        <h2 id={titleId} className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.2] tracking-[-0.03em]">{title}</h2>
        {children}
      </div>
    </div>
  );
}
