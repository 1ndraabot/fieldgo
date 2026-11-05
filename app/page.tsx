import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { CaraMemesan, Cta, DarkPanel, KalenderSection, LapanganSection, Stats } from '@/components/Sections';
import { getBerandaData } from '@/lib/beranda';

export const dynamic = 'force-dynamic'; // status slot harus selalu terbaru (PRD Bagian 6)

type Params = { olahraga?: string | string[]; tanggal?: string | string[] };

export default async function Beranda({ searchParams }: { searchParams: Promise<Params> }) {
  const data = await getBerandaData(await searchParams);
  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header />
      <main>
        <Hero data={data} />
        <DarkPanel data={data} />
        <Stats data={data} />
        <LapanganSection data={data} />
        <KalenderSection data={data} />
        <CaraMemesan />
        <Cta />
      </main>
      <Footer olahragaList={data.olahragaList} />
    </div>
  );
}
