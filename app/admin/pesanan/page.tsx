import type { Metadata } from "next";
import OrdersScreen from "@/components/admin/orders/OrdersScreen";
import { buildOrdersData } from "@/lib/mock-orders";

// Data contoh dihitung relatif terhadap waktu permintaan, jadi jangan di-cache statis.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pesanan — Panel admin Gelanggang", robots: { index: false, follow: false } };

type Props = { searchParams: { simulasi?: string } };

/**
 * /admin/pesanan — daftar semua pesanan dengan pencarian (kode / nama penyewa) dan filter status (FR-ADM-11).
 * FRONTEND SAJA: data contoh, tanpa autentikasi/otorisasi.
 * `?simulasi=gagal` → muat pertama gagal (lalu "Coba lagi" berhasil); `?simulasi=kosong` → belum ada pesanan.
 */
export default function AdminOrdersPage({ searchParams }: Props) {
  const s = searchParams.simulasi;
  return <OrdersScreen data={buildOrdersData(Date.now())} simulasi={s === "gagal" || s === "kosong" ? s : null} />;
}
