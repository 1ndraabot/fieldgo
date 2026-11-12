import { CardIcon, ShieldCheckIcon, XCircleIcon } from "@/components/detail-pesanan/ui/Icons";
import Heading from "@/components/detail-pesanan/ui/Heading";
import { GRID_STATES } from "@/lib/data";

const FEATURES = [
  { icon: ShieldCheckIcon, text: "Satu slot, satu pesanan. Tidak ada pemesanan ganda." },
  { icon: CardIcon, text: "Bayar dengan transfer, batas 24 jam atau sebelum jam main." },
  { icon: XCircleIcon, text: "Batal sebelum bayar langsung bisa, tanpa form." },
];

const CELL = {
  a: "bg-f1 text-f6",
  x: "bg-[#FDE4E5] text-[#B42328]",
  h: "bg-[#FFF1D6] text-[#7A4B00]",
  n: "bg-[#E3EAE6] text-[#4F6358]",
} as const;

const LEGEND = [
  { label: "Tersedia", cls: "bg-f1 border border-[#86E3AE]" },
  { label: "Terisi", cls: "bg-[#FDE4E5]" },
  { label: "Ditahan", cls: "bg-[#FFF1D6]" },
  { label: "Tidak tersedia", cls: "bg-[#E3EAE6]" },
];

export default function SlotFeature() {
  return (
    <section className="bg-f0 px-[clamp(16px,4.5vw,64px)] py-[110px]">
      <div className="mx-auto flex max-w-[1312px] flex-wrap items-center gap-16">
        <div className="flex-[1_1_420px]">
          <Heading accent="bayar tenang." className="text-[clamp(34px,3.8vw,52px)] leading-[1.15]">
            Slot jelas,
          </Heading>
          <p className="mb-8 mt-5 max-w-[480px] text-[17px] leading-[1.65] text-muted">
            Dari cek jadwal sampai verifikasi bukti, semuanya terlihat jelas di satu tempat. Tidak ada tebak-tebakan jam kosong.
          </p>
          <ul className="border-b border-line">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 border-t border-line py-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-f1">
                  <Icon size={22} stroke="#0E8A4A" strokeWidth={2.2} />
                </span>
                <span className="text-[17px] font-bold">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative box-border flex min-h-[520px] max-w-[640px] flex-[1_1_460px] items-center justify-center overflow-hidden rounded-[48px] bg-f8 p-7"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg,transparent 0 10%,rgba(198,244,50,.07) 10% 20%)",
          }}
        >
          <div aria-hidden="true" className="absolute right-[-80px] top-[-80px] h-[300px] w-[300px] rounded-full bg-lime opacity-35 blur-[80px]" />
          <div className="relative box-border w-full max-w-[520px] rounded-[28px] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,.3)]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[17px] font-bold">Futsal Arena A</span>
              <span className="text-[13px] font-medium text-muted">Sabtu, 7 November</span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-1.5" role="list" aria-label="Status slot per jam">
              {GRID_STATES.map((st, i) => {
                const h = i + 6;
                const t = `${h < 10 ? "0" : ""}${h}.00`;
                return (
                  <span
                    key={t}
                    role="listitem"
                    className={`flex h-11 items-center justify-center rounded-xl text-xs font-bold ${CELL[st]}`}
                  >
                    {t}
                  </span>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs font-medium text-muted">
              {LEGEND.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded-[4px] ${l.cls}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
