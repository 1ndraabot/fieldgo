import Link from "next/link";
import { PinIcon, StarIcon } from "@/components/ui/Icons";
import { fmtRupiah } from "@/lib/data";
import { minPrice, type CourtDetail } from "@/lib/court-detail";
import { ROUTES } from "@/lib/routes";

export default function CourtHeading({ court }: { court: CourtDetail }) {
  const words = court.name.split(" ");
  const last = words.pop();
  return (
    <section className="relative px-[clamp(16px,4.5vw,64px)] pt-8">
      <div aria-hidden="true" className="absolute right-[-100px] top-[-40px] z-0 h-[480px] w-[480px] rounded-full bg-f1 opacity-90 blur-[90px]" />
      <div aria-hidden="true" className="absolute left-[-140px] top-[120px] z-0 h-[400px] w-[400px] rounded-full bg-lime-soft opacity-70 blur-[90px]" />
      <div className="relative z-[1] mx-auto max-w-[1312px]">
        <Link href={ROUTES.home} className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Semua lapangan
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="inline-flex rounded-full bg-f1 px-4 py-2 text-[13px] font-bold text-f6">{court.sport}</span>
            <h1 className="mt-4 font-display text-[clamp(40px,6vw,76px)] font-bold leading-[1.05] tracking-[-0.04em]">
              {words.join(" ")} <span className="text-f4">{last}</span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-[22px] gap-y-2.5 text-[15px] font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <StarIcon size={16} fill="#F5A524" stroke="#F5A524" strokeWidth={1.5} />
                <span className="text-f9">{court.rating}</span> · {court.reviews} ulasan
              </span>
              <span className="flex items-center gap-1.5">
                <PinIcon size={16} strokeWidth={2.2} />
                {court.address}
              </span>
            </div>
          </div>

          <div className="rounded-[28px] bg-f9 px-[26px] py-[18px] text-right text-white">
            <div className="text-[13px] font-semibold text-white/75">Mulai dari</div>
            <div className="font-display text-[32px] font-bold tracking-[-0.03em] text-lime">
              {fmtRupiah(minPrice(court))} <span className="text-base font-semibold text-white/80">/ jam</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
