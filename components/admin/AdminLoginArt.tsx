import Logo from "@/components/ui/Logo";

const PITCHES = ["Antrean bukti pembayaran terlama dulu", "Rekap sewa siap diekspor ke CSV"];

/** Panel gelap di sisi kiri halaman login admin. */
export default function AdminLoginArt() {
  return (
    <aside className="dark relative box-border flex max-w-[640px] flex-[1_1_440px] flex-col justify-between gap-8 overflow-hidden rounded-r-[56px] bg-[#072218] px-[clamp(24px,4vw,64px)] py-11 text-white m:max-w-none m:rounded-r-none m:rounded-b-[40px]">
      <div aria-hidden="true" className="absolute right-[-80px] top-[-80px] h-80 w-80 rounded-full bg-lime opacity-25 blur-[90px]" />
      <div aria-hidden="true" className="absolute bottom-[-60px] left-[-100px] h-[360px] w-[360px] rounded-full bg-f3 opacity-35 blur-[90px]" />

      <div className="relative text-white"><Logo /></div>

      <div className="relative flex flex-col gap-[22px]">
        <span className="inline-flex h-[30px] items-center self-start rounded-full bg-lime px-3.5 text-[13px] font-bold text-f9">Panel admin</span>
        <h2 className="font-display text-[clamp(28px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.03em] text-white">
          Satu panel untuk <span className="text-lime">lapangan, tarif, jadwal, dan verifikasi.</span>
        </h2>
        <ul className="flex flex-col gap-[22px]">
          {PITCHES.map((t) => (
            <li key={t} className="flex items-center gap-3 text-base font-semibold text-white/90">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-lime">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B2B1E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-[13px] text-white/75">Login admin terpisah dari login penyewa.</p>
    </aside>
  );
}
