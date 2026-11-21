import Link from "next/link";
import CourtIllustration, { STRIPE_DARK, STRIPE_LIGHT } from "@/components/detail-pesanan/ui/CourtIllustration";
import { ArrowUpRightIcon, StarIcon } from "@/components/detail-pesanan/ui/Icons";
import { fmtRupiah, type Court } from "@/lib/data";
import { ROUTES } from "@/lib/routes";

const LIGHT_BASES = ["#C6F432", "#A7F0E0", "#DDF7E8"];

export default function CourtCard({ court: c }: { court: Court }) {
  return (
    <article className="card flex flex-col gap-5">
      <Link
        href={ROUTES.court(c.id)}
        aria-label={`Lihat detail ${c.name}`}
        className="relative block aspect-[416/300]"
      >
        <div
          className="card-img absolute inset-0 overflow-hidden rounded-[36px]"
          style={{
            backgroundColor: c.base,
            backgroundImage: LIGHT_BASES.includes(c.base) ? STRIPE_LIGHT : STRIPE_DARK,
          }}
        >
          <CourtIllustration kind={c.kind} color={c.line} />
        </div>
        <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-[9px] text-[13px] font-bold">
          {c.sport}
        </span>
        {c.hot && (
          <span className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-f9 px-3.5 py-[9px] text-[13px] font-bold text-white">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lime" />
            Terlaris
          </span>
        )}
        <span
          aria-hidden="true"
          className={`absolute bottom-[18px] right-[18px] flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-[0_10px_24px_rgba(8,44,28,.2)] ${c.hot ? "bg-lime" : "bg-white"
            }`}
        >
          <ArrowUpRightIcon size={24} stroke="#0B2B1E" strokeWidth={2.4} />
        </span>
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]">{c.name}</h3>
        <span className="flex items-center gap-[5px] text-[15px] font-bold">
          <StarIcon size={16} fill="#F5A524" stroke="#F5A524" strokeWidth={1.5} />
          {c.rating}
        </span>
      </div>
      <div className="-mt-2 flex items-baseline justify-between gap-3">
        <span>
          <span className="font-display text-[19px] font-bold text-f5">{fmtRupiah(c.price)}</span>{" "}
          <span className="text-sm font-medium text-muted">/ jam</span>
        </span>
        <span className="text-sm font-medium text-muted">{c.meta}</span>
      </div>
    </article>
  );
}
