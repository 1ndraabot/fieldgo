import type { Metadata } from "next";
import Link from "next/link";
import Banner from "@/components/booking/Banner";
import BookingFlow from "@/components/booking/BookingFlow";
import StepIndicator from "@/components/booking/StepIndicator";
import Header from "@/components/home/Header";
import { getAuthUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { loadPesanInitial, type PesanInitial } from "@/lib/server/pesan-data";

// Ketersediaan & sesi bergantung pada waktu dan cookie — tidak boleh di-cache statis.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pesan lapangan — Gelanggang" };

type Props = { searchParams: { lapangan?: string; tanggal?: string; jam?: string } };

export default function PesanPage({ searchParams }: Props) {
  const nowMs = Date.now();
  const user = getAuthUser();
  const auth = !user ? "guest" : user.verified ? "verified" : "unverified";

  let initial: PesanInitial | null = null;
  let failed = false;
  try { initial = loadPesanInitial(searchParams, nowMs); } catch (e) { console.error("[/pesan]", e); failed = true; }

  return (
    <div className="relative mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header user={user} />
      <main className="relative px-[clamp(16px,4.5vw,64px)] pb-[100px] pt-6">
        <div aria-hidden="true" className="absolute right-[-100px] top-[-40px] h-[440px] w-[440px] rounded-full bg-f1 opacity-90 blur-[90px]" />
        <div aria-hidden="true" className="absolute left-[-140px] top-[420px] h-[400px] w-[400px] rounded-full bg-lime-soft opacity-60 blur-[90px]" />

        <div className="relative z-[1] mx-auto max-w-[1312px]">
          <StepIndicator current={0} />
          <h1 className="m-0 font-display text-[clamp(34px,4.6vw,60px)] font-bold leading-[1.1] tracking-[-0.04em]">
            Pesan <span className="text-f4">lapangan</span>
          </h1>

          {auth === "unverified" && (
            <Banner tone="amber" role="alert" icon="alert" className="mt-6">
              Email kamu belum diverifikasi, jadi belum bisa memesan.{" "}
              <Link href={ROUTES.verifyEmail} className="font-bold text-[#5A3700] underline">Verifikasi email sekarang</Link>
            </Banner>
          )}
          {auth === "guest" && (
            <Banner tone="teal" role="note" icon="info" className="mt-6">
              Kamu belum masuk. Pilih slot dulu; setelah masuk, kamu kembali ke halaman ini dengan pilihan slot tetap tersimpan.
            </Banner>
          )}

          {initial ? (
            <BookingFlow
              courts={initial.courts} auth={auth} nowMs={nowMs} batasBayarJam={initial.batasBayarJam}
              initial={{ courtId: initial.courtId, date: initial.date, slots: initial.slots, hours: initial.hours, note: initial.note, fromQuery: initial.fromQuery }}
            />
          ) : (
            <Banner tone="red" role="alert" className="mt-8">
              {failed
                ? "Halaman pemesanan belum bisa dimuat karena basis data tidak tersedia. Coba lagi sebentar lagi."
                : "Belum ada lapangan yang menerima pesanan."}
            </Banner>
          )}
        </div>
      </main>
    </div>
  );
}
