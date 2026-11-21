import Link from "next/link";
import { BallIcon } from "./Icons";
import { ROUTES } from "@/lib/routes";

export default function Logo() {
  return (
    <Link href={ROUTES.home} className="flex items-center gap-3" aria-label="Gelanggang — Beranda">
      <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-f4">
        <BallIcon size={24} stroke="#C6F432" strokeWidth={2.2} />
      </span>
      <span className="font-display text-2xl font-bold tracking-[-0.02em]">Gelanggang</span>
    </Link>
  );
}
