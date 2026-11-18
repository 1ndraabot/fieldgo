import type { Metadata } from "next";
import TariffsScreen from "@/components/admin/tariffs/TariffsScreen";
import { buildTariffsData } from "@/lib/mock-tariffs";

// Pesanan contoh dihitung relatif terhadap waktu permintaan, jadi jangan di-cache statis.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tarif — Panel admin Gelanggang", robots: { index: false, follow: false } };

type Props = { searchParams: { simulasi?: string } };

/**
 * /admin/tarif — kelola tarif per lapangan, tipe hari, dan rentang jam (FR-ADM-03).
 * FRONTEND SAJA: data contoh, tanpa autentikasi/otorisasi. `?simulasi=gagal` membuat penyimpanan gagal sekali
 * per lapangan (untuk mencoba tampilan galat).
 */
export default function AdminTariffsPage({ searchParams }: Props) {
  return <TariffsScreen data={buildTariffsData(Date.now())} failOnce={searchParams.simulasi === "gagal"} />;
}
