import CourtIllustration, { STRIPE_DARK, STRIPE_LIGHT } from "@/components/ui/CourtIllustration";
import type { CourtDetail } from "@/lib/court-detail";

const LIGHT = ["#C6F432", "#A7F0E0", "#DDF7E8"];
const stripe = (base: string) => (LIGHT.includes(base) ? STRIPE_LIGHT : STRIPE_DARK);

/** Foto utama + dua foto pendukung (ilustrasi lapangan, sesuai desain referensi). */
export default function CourtGallery({ court }: { court: CourtDetail }) {
  const sport = court.sport.toLowerCase();
  return (
    <section aria-label={`Galeri foto ${court.name}`} className="px-[clamp(16px,4.5vw,64px)] pt-9">
      <div className="mx-auto grid max-w-[1312px] grid-cols-1 gap-5 min-[981px]:grid-cols-3">
        <div
          className="relative aspect-[780/440] min-h-[300px] overflow-hidden rounded-[44px] min-[981px]:col-span-2"
          style={{ backgroundColor: court.base, backgroundImage: stripe(court.base) }}
        >
          <CourtIllustration kind={court.kind} color={court.line} strokeWidth={2.6} label={`Ilustrasi lapangan ${sport}, tampak atas`} />
          <span className="absolute bottom-6 left-6 flex items-center gap-2 rounded-full bg-f9/[.92] px-[18px] py-2.5 text-sm font-bold text-white">
            <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-lime" />
            {court.badge}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-5 min-[981px]:grid-cols-1 min-[981px]:grid-rows-2">
          <div
            className="relative min-h-[140px] overflow-hidden rounded-[36px] bg-f7"
            style={{ backgroundImage: "repeating-linear-gradient(90deg,transparent 0 10%,rgba(255,255,255,.07) 10% 20%)" }}
          >
            <CourtIllustration kind={court.kind} color="#C6F432" strokeWidth={2.6} label={`Sudut lapangan ${sport} dengan pencahayaan sorot`} />
          </div>
          <div className="relative min-h-[140px] overflow-hidden rounded-[36px] bg-lime" style={{ backgroundImage: STRIPE_LIGHT }}>
            <CourtIllustration kind={court.kind} color="#0B2B1E" strokeWidth={2.6} label={`Tampilan area gawang dan garis lapangan ${sport}`} />
          </div>
        </div>
      </div>
    </section>
  );
}
