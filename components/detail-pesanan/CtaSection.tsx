import Link from "next/link";
import ArrowButton from "@/components/detail-pesanan/ui/ArrowButton";
import Heading from "@/components/detail-pesanan/ui/Heading";
import { DEFAULT_COURT_ID, ROUTES } from "@/lib/routes";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-f0 px-[clamp(16px,4.5vw,64px)] py-[120px] text-center">
      <div aria-hidden="true" className="absolute left-[8%] top-[-60px] h-[360px] w-[360px] rounded-full bg-lime-soft opacity-80 blur-[90px]" />
      <div aria-hidden="true" className="absolute bottom-[-100px] right-[6%] h-[400px] w-[400px] rounded-full bg-mint opacity-50 blur-[90px]" />
      <Heading
        accent="Amankan jam kamu."
        className="relative mx-auto max-w-[860px] text-[clamp(36px,4.8vw,64px)] leading-[1.12]"
      >
        Siap main hari ini?
      </Heading>
      <div className="relative mt-9 flex flex-wrap justify-center gap-3.5">
        <ArrowButton href={ROUTES.court(DEFAULT_COURT_ID)}>Pesan lapangan</ArrowButton>
        <Link
          href={ROUTES.mySchedule}
          className="btn flex h-14 items-center rounded-full border-[1.5px] border-f9 px-7 text-base font-bold"
        >
          Lihat jadwal saya
        </Link>
      </div>
    </section>
  );
}
