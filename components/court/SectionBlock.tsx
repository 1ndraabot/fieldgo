import type { ReactNode } from "react";

export default function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-[18px] font-display text-[28px] font-bold tracking-[-0.03em]">{title}</h2>
      {children}
    </section>
  );
}
