import type { Metadata } from "next";
import VerificationScreen from "@/components/admin/verification/VerificationScreen";
import { buildVerificationData } from "@/lib/mock-verification";

// Data contoh dihitung relatif terhadap waktu permintaan, jadi jangan di-cache statis.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verifikasi — Panel admin Gelanggang", robots: { index: false, follow: false } };

type Props = { searchParams: { simulasi?: string } };

/**
 * /admin/verifikasi — antrean bukti pembayaran & pengajuan pembatalan (FR-ADM-06, FR-ADM-07).
 * FRONTEND SAJA: data contoh, tanpa autentikasi/otorisasi. `?simulasi=gagal` membuat tiap keputusan gagal sekali
 * (untuk mencoba tampilan galat).
 */
export default function AdminVerificationPage({ searchParams }: Props) {
  const nowMs = Date.now();
  return <VerificationScreen data={buildVerificationData(nowMs)} nowMs={nowMs} failOnce={searchParams.simulasi === "gagal"} />;
}
