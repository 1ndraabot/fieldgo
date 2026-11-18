import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/home/Header";
import CourtFooter from "@/components/court/CourtFooter";
import PaymentFlow from "@/components/payment/PaymentFlow";
import { MOCK_USER, loadPaymentOrder } from "@/lib/mock-order";

// Tenggat contoh dihitung relatif terhadap waktu permintaan, jadi jangan di-cache statis.
export const dynamic = "force-dynamic";

type Props = { params: { kode: string }; searchParams: { sisa?: string } };

const KODE = /^[A-Za-z0-9-]{4,32}$/;

export function generateMetadata({ params }: Props): Metadata {
  return { title: `Pembayaran ${params.kode} — Gelanggang`, robots: { index: false } };
}

export default function PaymentPage({ params, searchParams }: Props) {
  if (!KODE.test(params.kode)) notFound();
  // ?sisa=15 → mulai countdown dari 15 detik (hanya untuk mencoba tampilan kedaluwarsa pada data contoh)
  const sisa = Number(searchParams.sisa);
  const order = loadPaymentOrder(params.kode.toUpperCase(), Date.now(), Number.isInteger(sisa) && sisa >= 0 && sisa <= 86400 && searchParams.sisa ? { remainingSec: sisa } : undefined);

  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header user={MOCK_USER} active="Jadwal saya" />
      <main className="relative px-[clamp(16px,4.5vw,64px)] pb-[110px] pt-8">
        <div aria-hidden="true" className="absolute right-[-100px] top-[-20px] z-0 h-[460px] w-[460px] rounded-full bg-f1 opacity-90 blur-[90px]" />
        <div aria-hidden="true" className="absolute left-[-140px] top-[560px] z-0 h-[420px] w-[420px] rounded-full bg-lime-soft opacity-60 blur-[90px]" />
        <div className="relative z-[1] mx-auto max-w-[1312px]">
          <PaymentFlow order={order} />
        </div>
      </main>
      <CourtFooter />
    </div>
  );
}
