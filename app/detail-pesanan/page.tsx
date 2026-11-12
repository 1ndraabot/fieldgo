import { Header } from "@/components/Header";
import DarkPanel from "@/components/detail-pesanan/DarkPanel";
import Stats from "@/components/detail-pesanan/Stats";
import CourtList from "@/components/detail-pesanan/CourtList";
import SlotFeature from "@/components/detail-pesanan/SlotFeature";
import HowItWorks from "@/components/detail-pesanan/HowItWorks";
import CtaSection from "@/components/detail-pesanan/CtaSection";
import { Footer } from "@/components/Footer";

export default function DetailPesananPage() {
  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header />
      <main>
        <DarkPanel />
        <Stats />
        <CourtList />
        <SlotFeature />
        <HowItWorks />
        <CtaSection />
      </main>
      <Footer olahragaList={[]} />
    </div>
  );
}
