import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import DarkPanel from "@/components/home/DarkPanel";
import Stats from "@/components/home/Stats";
import CourtList from "@/components/home/CourtList";
import SlotFeature from "@/components/home/SlotFeature";
import HowItWorks from "@/components/home/HowItWorks";
import CtaSection from "@/components/home/CtaSection";
import Footer from "@/components/home/Footer";

export default function HomePage() {
  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header />
      <main>
        <Hero />
        <DarkPanel />
        <Stats />
        <CourtList />
        <SlotFeature />
        <HowItWorks />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
