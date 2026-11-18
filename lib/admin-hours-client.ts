import type { DayHours } from "./court-detail";

/**
 * PENGGANTI SEMENTARA untuk API admin. Hanya simulasi di browser: TIDAK ada yang dikirim atau disimpan.
 * Ganti dengan fetch ke backend (simpan jam operasional lapangan — FR-ADM-04). Backend wajib memvalidasi ulang
 * (06–24, tutup > buka) dan tidak membatalkan pesanan yang sudah ada.
 */
type Opts = { delayMs?: number; fail?: boolean };

export async function saveOperatingHours(_courtId: string, _week: DayHours[], { delayMs = 900, fail = false }: Opts = {}) {
  await new Promise((r) => setTimeout(r, delayMs));
  if (fail) throw new Error("simulasi gagal");
}
