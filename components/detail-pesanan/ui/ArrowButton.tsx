import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "./Icons";

type Props = {
  href: string;
  children: ReactNode;
  /** warna tombol */
  tone?: "green" | "lime";
};

/** Tombol pil dengan lingkaran panah di kanan (CTA utama). */
export default function ArrowButton({ href, children, tone = "green" }: Props) {
  const isLime = tone === "lime";
  return (
    <Link
      href={href}
      className={`btn flex h-14 items-center gap-3 rounded-full pl-7 pr-[10px] text-base font-bold ${
        isLime ? "bg-lime text-f9" : "bg-f5 text-white"
      }`}
    >
      {children}
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isLime ? "bg-f9" : "bg-lime"}`}>
        <ArrowUpRightIcon size={18} stroke={isLime ? "#C6F432" : "#0B2B1E"} strokeWidth={2.4} />
      </span>
    </Link>
  );
}
