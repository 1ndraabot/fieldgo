const STATS = [
  { value: "48", unit: "+", label: "Lapangan aktif di 5 cabang olahraga" },
  { value: "24", unit: "K", label: "Jam main terpesan tiap bulan" },
  { value: "4.9", unit: "/5", label: "Rating rata-rata dari para pemain" },
];

export default function Stats() {
  return (
    <section
      aria-label="Angka Gelanggang"
      className="relative z-0 -mt-[100px] bg-f0 px-6 pb-[100px] pt-[196px]"
    >
      <div className="flex flex-wrap justify-center gap-x-0 gap-y-12">
        {STATS.map((s) => (
          <div key={s.label} className="stat flex-[0_1_440px] px-6 text-center">
            <div className="flex items-start justify-center gap-1">
              <span className="font-display text-[clamp(64px,8vw,104px)] font-bold leading-[1.05] tracking-[-0.05em]">
                {s.value}
              </span>
              <span className="mt-2 font-display text-[40px] font-bold text-f4">{s.unit}</span>
            </div>
            <p className="mx-auto mt-1.5 max-w-[280px] text-base font-medium text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
