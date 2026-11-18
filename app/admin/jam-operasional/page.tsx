import type { Metadata } from "next";
import HoursScreen from "@/components/admin/hours/HoursScreen";
import { buildHoursData } from "@/lib/mock-hours";

// Jumlah pesanan contoh dihitung relatif terhadap waktu permintaan, jadi jangan di-cache statis.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jam operasional — Panel admin Gelanggang", robots: { index: false, follow: false } };

type Props = { searchParams: { simulasi?: string } };

/**
 * /admin/jam-operasional — jam buka/tutup per lapangan per hari (FR-ADM-04).
 * FRONTEND SAJA: data contoh, tanpa autentikasi/otorisasi. `?simulasi=gagal` membuat penyimpanan gagal sekali
 * per lapangan (untuk mencoba tampilan galat).
 */
export default function AdminHoursPage({ searchParams }: Props) {
  return <HoursScreen data={buildHoursData(Date.now())} failOnce={searchParams.simulasi === "gagal"} />;
}
