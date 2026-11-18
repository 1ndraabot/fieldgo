import type { Metadata } from "next";
import SettingsScreen from "@/components/admin/settings/SettingsScreen";
import { buildSettings } from "@/lib/mock-settings";

export const metadata: Metadata = { title: "Pengaturan — Panel admin Gelanggang", robots: { index: false, follow: false } };

type Props = { searchParams: { simulasi?: string } };

/**
 * /admin/pengaturan — rekening tujuan, batas bayar, dan batas pembatalan (FR-ADM-10).
 * FRONTEND SAJA: data contoh, tanpa autentikasi/otorisasi. `?simulasi=gagal` membuat penyimpanan pertama gagal
 * (untuk mencoba tampilan galat), lalu berhasil saat dicoba lagi.
 */
export default function AdminSettingsPage({ searchParams }: Props) {
  return <SettingsScreen initial={buildSettings()} failOnce={searchParams.simulasi === "gagal"} />;
}
