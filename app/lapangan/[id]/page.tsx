import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/home/Header";
import BookingPanel, { type CourtAvailability } from "@/components/court/BookingPanel";
import CourtFooter from "@/components/court/CourtFooter";
import CourtGallery from "@/components/court/CourtGallery";
import CourtHeading from "@/components/court/CourtHeading";
import FacilityList from "@/components/court/FacilityList";
import LocationMap from "@/components/court/LocationMap";
import OperatingHours from "@/components/court/OperatingHours";
import PriceTable from "@/components/court/PriceTable";
import SectionBlock from "@/components/court/SectionBlock";
import { getAuthUser } from "@/lib/auth";
import { MAX_WEEKS_AHEAD } from "@/lib/availability";
import { getCourtDetail, type CourtDetail } from "@/lib/court-detail";
import { wibNow } from "@/lib/datetime";
import { loadAvailabilityRange, loadCourtDetail } from "@/lib/server/repo";

// Status slot bergantung pada waktu sekarang; jangan di-cache statis.
export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export function generateMetadata({ params }: Props): Metadata {
  const court = getCourtDetail(params.id);
  return court
    ? { title: `${court.name} — Gelanggang`, description: court.description }
    : { title: "Lapangan tidak ditemukan — Gelanggang" };
}

export default function CourtDetailPage({ params }: Props) {
  const nowMs = Date.now();

  // Sumber utama: basis data (tarif, jam, pesanan aktif). Bila DB tak tersedia, pakai data contoh.
  let court: CourtDetail | null = null;
  let availability: CourtAvailability | undefined;
  try {
    court = loadCourtDetail(params.id);
    if (court) availability = loadAvailabilityRange(params.id, wibNow(nowMs).dateISO, MAX_WEEKS_AHEAD * 7, nowMs);
  } catch (e) {
    console.error("[/lapangan]", e);
    court = getCourtDetail(params.id);
  }
  if (!court) notFound();

  const user = getAuthUser();
  const auth = !user ? "guest" : user.verified ? "verified" : "unverified";

  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header user={user} />
      <main>
        <CourtHeading court={court} />
        <CourtGallery court={court} />

        <section className="px-[clamp(16px,4.5vw,64px)] pb-[110px] pt-16">
          <div className="mx-auto flex max-w-[1312px] flex-wrap items-start gap-14">
            <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-14">
              <SectionBlock title="Deskripsi">
                <p className="max-w-[720px] text-[17px] leading-[1.7] text-muted">{court.description}</p>
              </SectionBlock>
              <SectionBlock title="Fasilitas">
                <FacilityList items={court.facilities} />
              </SectionBlock>
              <SectionBlock title="Lokasi">
                <LocationMap name={court.name} address={court.address} lat={court.lat} lng={court.lng} />
              </SectionBlock>
              <SectionBlock title="Harga">
                <PriceTable tariffs={court.tariffs} />
              </SectionBlock>
              <SectionBlock title="Jam operasional">
                <OperatingHours hours={court.hours} />
              </SectionBlock>
            </div>

            <BookingPanel court={court} nowMs={nowMs} auth={auth} availability={availability} />
          </div>
        </section>
      </main>
      <CourtFooter />
    </div>
  );
}
