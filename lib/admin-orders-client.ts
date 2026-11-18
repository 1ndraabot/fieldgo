import type { AdminOrder } from "./admin-orders";

/**
 * PENGGANTI SEMENTARA untuk API admin. Hanya simulasi di browser: memuat data contoh setelah jeda singkat
 * agar loading state terlihat. Ganti dengan fetch ke backend (daftar semua pesanan, dengan pencarian, filter
 * status, dan pagination di sisi server — FR-ADM-11).
 */
type Opts = { delayMs?: number; fail?: boolean };

export async function fetchOrders(orders: AdminOrder[], { delayMs = 600, fail = false }: Opts = {}): Promise<AdminOrder[]> {
  await new Promise((r) => setTimeout(r, delayMs));
  if (fail) throw new Error("simulasi gagal");
  return orders;
}
