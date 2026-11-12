import Link from "next/link";
import CourtIllustration, { STRIPE_DARK } from "@/components/detail-pesanan/ui/CourtIllustration";
import { BallIcon, CheckIcon, ShuttleIcon } from "@/components/detail-pesanan/ui/Icons";
import ArrowButton from "@/components/detail-pesanan/ui/ArrowButton";
import { SPORTS } from "@/lib/data";
import { DEFAULT_COURT_ID, ROUTES } from "@/lib/routes";

export default function DarkPanel() {
  return (
    <section className="dark relative z-[1] mx-[clamp(8px,2.2vw,32px)] overflow-hidden rounded-[64px] bg-f9 px-[clamp(20px,5vw,72px)] pb-[88px] pt-[340px]">
      <div aria-hidden="true" className="absolute right-[-60px] top-[-140px] h-[520px] w-[520px] rounded-full bg-f3 opacity-30 blur-[110px]" />
      <div aria-hidden="true" className="absolute bottom-[-60px] left-[-180px] h-[560px] w-[560px] rounded-full bg-lime opacity-30 blur-[110px]" />

      <ul className="relative flex flex-wrap justify-between gap-x-8 gap-y-5" aria-label="Cabang olahraga">
        {SPORTS.map((name) => (
          <li key={name} className="flex items-center gap-2.5 font-display text-[22px] font-semibold text-white/80">
            <BallIcon size={26} stroke="#C6F432" />
            {name}
          </li>
        ))}
      </ul>

      <div className="relative mt-[72px] flex flex-wrap items-center gap-14">
        <div className="relative aspect-[7/5] max-w-[560px] flex-[1_1_380px]">
          <div
            className="absolute inset-0 overflow-hidden rounded-[40px] bg-f3"
            style={{ backgroundImage: STRIPE_DARK }}
          >
            <CourtIllustration kind="futsal" label="Ilustrasi lapangan futsal" />
          </div>
          <div className="absolute bottom-6 left-6 flex items-center gap-2.5 rounded-full bg-f9/[.92] py-2 pl-2 pr-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime">
              <CheckIcon size={18} stroke="#0B2B1E" strokeWidth={3} />
            </span>
            <span className="text-sm font-bold text-white">14 slot kosong hari ini</span>
          </div>
          <div
            aria-hidden="true"
            className="absolute -top-7 right-[-18px] flex h-28 w-28 items-center justify-center rounded-[36px] bg-white shadow-[0_16px_32px_rgba(0,0,0,.25)]"
          >
            <ShuttleIcon size={56} stroke="#16A05A" strokeWidth={2.6} />
          </div>
        </div>

        <div className="max-w-[620px] flex-[1_1_380px]">
          <h2 className="font-display text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.18] tracking-[-0.03em] text-white">
            <span className="text-lime">#1</span> Booking Lapangan
            <br />
            Paling Praktis di Kotamu
          </h2>
          <p className="mt-[22px] max-w-[520px] text-[17px] leading-[1.65] text-white/80">
            Gelanggang menghubungkan pemain dengan lapangan terbaik. Lihat slot real-time, pesan, bayar lewat transfer, dan admin memverifikasi buktinya. Jam kamu aman.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3.5">
            <ArrowButton href={ROUTES.court(DEFAULT_COURT_ID)} tone="lime">
              Lihat slot kosong
            </ArrowButton>
            <Link
              href="#cara"
              className="btn flex h-14 items-center rounded-full border-[1.5px] border-white/45 px-7 text-base font-bold text-white"
            >
              Cara memesan
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
