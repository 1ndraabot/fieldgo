import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  accent: ReactNode;
  className?: string;
};

/** Judul seksi: baris pertama gelap, baris kedua hijau (aksen desain referensi). */
export default function Heading({ children, accent, className = "" }: Props) {
  return (
    <h2 className={`font-display font-bold tracking-[-0.035em] ${className}`}>
      {children}
      <br />
      <span className="text-f4">{accent}</span>
    </h2>
  );
}
