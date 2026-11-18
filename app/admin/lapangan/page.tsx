import type { Metadata } from "next";
import CourtsScreen from "@/components/admin/courts/CourtsScreen";
import { buildAdminCourtsData } from "@/lib/mock-admin-courts";

export const metadata: Metadata = { title: "Lapangan — Panel admin Gelanggang", robots: { index: false, follow: false } };

type Props = { searchParams: { simulasi?: string } };

/**
 * /admin/lapangan — kelola lapangan, jenis olahraga, dan fasilitas (FR-ADM-02).
 * FRONTEND SAJA: data contoh, tanpa autentikasi/otorisasi. `?simulasi=gagal` membuat tiap aksi gagal sekali
 * (untuk mencoba tampilan galat).
 */
export default function AdminCourtsPage({ searchParams }: Props) {
  return <CourtsScreen data={buildAdminCourtsData()} failOnce={searchParams.simulasi === "gagal"} />;
}
