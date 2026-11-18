import type { Tariff } from "./court-detail";

/**
 * PENGGANTI SEMENTARA untuk API admin. Hanya simulasi di browser: TIDAK ada yang dikirim atau disimpan.
 * Ganti dengan fetch ke backend (simpan tarif lapangan — FR-ADM-03). Backend wajib memvalidasi ulang
 * (tanpa tumpang tindih, harga > 0) dan tidak mengubah harga terkunci pada pesanan yang sudah ada.
 */
type Opts = { delayMs?: number; fail?: boolean };

export async function saveTariffs(_courtId: string, _tariffs: Tariff[], { delayMs = 900, fail = false }: Opts = {}) {
  await new Promise((r) => setTimeout(r, delayMs));
  if (fail) throw new Error("simulasi gagal");
}
