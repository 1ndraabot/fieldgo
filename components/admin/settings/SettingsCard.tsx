import type { ReactNode } from "react";

type Props = { title: string; subtitle: string; current: ReactNode; children: ReactNode };

/** Kartu satu kelompok pengaturan, dengan baris "Berlaku saat ini" (nilai yang sudah tersimpan). */
export default function SettingsCard({ title, subtitle, current, children }: Props) {
  return (
    <section aria-label={title} className="flex flex-col gap-[18px] rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
      <div>
        <h2 className="font-display text-[clamp(22px,2.4vw,28px)] font-bold leading-[1.2] tracking-[-0.03em]">{title}</h2>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        <p className="mt-3 rounded-2xl bg-f0 px-4 py-2.5 text-[13px] font-medium text-muted">Berlaku saat ini: <b className="text-f9">{current}</b></p>
      </div>
      {children}
    </section>
  );
}
