import Link from "next/link";
import CourtIllustration, { STRIPE_DARK } from "@/components/ui/CourtIllustration";
import {
  BallIcon, CalendarIcon, ClockIcon, PinIcon, SearchIcon, ShuttleIcon, StarIcon,
} from "@/components/ui/Icons";
import SlotCard from "./SlotCard";
import { DEFAULT_COURT_ID, ROUTES } from "@/lib/routes";
import type { ReactNode } from "react";

function SearchField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-[1_1_200px] items-center gap-3 px-3.5 py-1">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-f1">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-[15px] font-bold">{value}</span>
      </span>
    </div>
  );
}

const Divider = () => <div aria-hidden="true" className="hide-m h-9 w-px bg-line" />;

export default function Hero() {
  const ic = { size: 20, stroke: "#0E8A4A", strokeWidth: 2.2 };
  return (
    <section className="relative px-[clamp(16px,4.5vw,64px)] pb-0 pt-12 text-center">
      {/* blob latar */}
      <div aria-hidden="true" className="absolute left-[-160px] top-[260px] z-0 h-[520px] w-[520px] rounded-full bg-lime-soft opacity-80 blur-[90px]" />
      <div aria-hidden="true" className="absolute right-[-120px] top-[-60px] z-0 h-[560px] w-[560px] rounded-full bg-f1 opacity-95 blur-[90px]" />
      <div aria-hidden="true" className="absolute right-[-60px] top-[420px] z-0 h-[360px] w-[360px] rounded-full bg-mint opacity-45 blur-[90px]" />

      {/* ornamen melayang */}
      <div
        aria-hidden="true"
        className="float-m absolute left-[11%] top-[150px] z-[2] flex h-[72px] w-[72px] items-center justify-center rounded-full border border-line bg-white shadow-[0_12px_28px_rgba(8,44,28,.14)]"
      >
        <BallIcon size={36} stroke="#16A05A" />
      </div>
      <div
        aria-hidden="true"
        className="float-m absolute right-[11%] top-9 z-[2] flex h-[92px] w-[92px] items-center justify-center rounded-full bg-lime"
      >
        <ShuttleIcon size={44} stroke="#0B2B1E" strokeWidth={2.6} />
      </div>

      <h1 className="relative z-[2] mx-auto max-w-[1000px] font-display text-[clamp(40px,6.4vw,80px)] font-bold leading-[1.1] tracking-[-0.035em]">
        Pesan Lapangan,
        <br />
        <span className="text-f4">Jam demi Jam.</span>
      </h1>
      <p className="relative z-[2] mx-auto mt-6 max-w-[560px] text-lg leading-[1.6] text-muted">
        Cek slot kosong, pilih jam, lalu unggah bukti transfer. Tanpa chat ke admin, tanpa bentrok jadwal.
      </p>

      {/* pencarian */}
      <div
        role="search"
        aria-label="Cari slot lapangan"
        className="relative z-[2] mx-auto mt-9 flex max-w-[900px] flex-wrap items-center gap-1.5 rounded-[44px] border-[1.5px] border-line bg-white py-2.5 pl-3 pr-2.5 text-left shadow-[0_20px_44px_rgba(8,44,28,.1)]"
      >
        <SearchField icon={<BallIcon {...ic} />} label="Olahraga" value="Futsal" />
        <Divider />
        <SearchField icon={<CalendarIcon {...ic} />} label="Tanggal" value="Sab, 7 Nov" />
        <Divider />
        <SearchField icon={<ClockIcon {...ic} />} label="Jam main" value="20.00 – 22.00" />
        <Link
          href={ROUTES.court(DEFAULT_COURT_ID)}
          className="btn flex h-14 items-center gap-2.5 rounded-full bg-f5 pl-7 pr-2.5 text-base font-bold text-white"
        >
          Cari slot
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
            <SearchIcon size={18} stroke="#0B2B1E" strokeWidth={2.4} />
          </span>
        </Link>
      </div>

      {/* panggung: ilustrasi lapangan, menimpa panel gelap */}
      <div className="relative z-[3] mx-auto mb-[-240px] mt-14 aspect-[19/10] w-full max-w-[780px]">
        <div aria-hidden="true" className="absolute inset-0 rotate-[5deg] rounded-[40px] bg-lime" />
        <div aria-hidden="true" className="absolute inset-0 -rotate-[5deg] rounded-[40px] bg-f1" />
        <div
          className="absolute inset-0 box-border overflow-hidden rounded-[40px] border-8 border-white bg-f3 shadow-[0_32px_60px_rgba(8,44,28,.3)]"
          style={{ backgroundImage: STRIPE_DARK }}
        >
          <CourtIllustration kind="futsal" label="Ilustrasi lapangan futsal" />
        </div>

        <div className="absolute -top-[34px] right-[-20px] flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-lime shadow-[0_14px_28px_rgba(8,44,28,.18)]">
          <span className="flex items-center gap-1 font-display text-[22px] font-extrabold">
            <StarIcon size={18} stroke="#0B2B1E" />4.9
          </span>
          <span className="text-xs font-semibold">rating</span>
        </div>

        <div className="float-m absolute left-[-90px] top-[36%] flex items-center gap-2 rounded-full border border-line bg-white py-2 pl-2.5 pr-[18px] shadow-[0_14px_30px_rgba(8,44,28,.2)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-f1">
            <PinIcon size={16} stroke="#0E8A4A" strokeWidth={2.4} />
          </span>
          <span className="text-sm font-bold">Jl. Sudirman No. 24</span>
        </div>

        <div className="float-m absolute -bottom-4 left-[-40px] flex items-center gap-2 rounded-full bg-f9 py-3 pl-4 pr-[18px] shadow-[0_14px_30px_rgba(8,44,28,.3)]">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-lime" />
          <span className="text-[13px] font-semibold text-white">Slot live · diperbarui detik ini</span>
        </div>

        <SlotCard />
      </div>
    </section>
  );
}
