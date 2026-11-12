"use client";

import { useState } from "react";
import { BallHalfIcon } from "@/components/detail-pesanan/ui/Icons";
import Heading from "@/components/detail-pesanan/ui/Heading";
import CourtCard from "./CourtCard";
import { COURTS, FILTERS } from "@/lib/data";

/** Seksi "Pilih Lapangan" dengan filter olahraga. */
export default function CourtList() {
  const [filter, setFilter] = useState("Semua");
  const courts = COURTS.filter((c) => filter === "Semua" || c.sport === filter);

  return (
    <section id="lapangan" className="bg-white px-[clamp(16px,4.5vw,64px)] py-[130px] text-center">
      <span className="inline-flex items-center gap-2.5 rounded-full bg-f1 py-[7px] pl-2 pr-[18px] text-sm font-bold text-f6">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-f5">
          <BallHalfIcon size={14} stroke="#fff" strokeWidth={2.6} />
        </span>
        6 lapangan · 5 cabang olahraga
      </span>

      <Heading
        accent="Sesuai Gayamu"
        className="mx-auto mt-[22px] max-w-[900px] text-[clamp(36px,4.4vw,60px)] leading-[1.13]"
      >
        Pilih Lapangan
      </Heading>

      <div role="group" aria-label="Filter jenis olahraga" className="mt-10 flex flex-wrap justify-center gap-3">
        {FILTERS.map((name) => {
          const active = filter === name;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(name)}
              className={`h-12 cursor-pointer rounded-full border-[1.5px] px-[26px] text-[15px] font-bold ${active ? "border-f9 bg-f9 text-white" : "border-line bg-f0 text-f9"
                }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-14 grid max-w-[1312px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-x-8 gap-y-14 text-left">
        {courts.map((c) => (
          <CourtCard key={c.id} court={c} />
        ))}
      </div>
    </section>
  );
}
