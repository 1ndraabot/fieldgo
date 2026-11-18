import type { SettingsForm } from "./admin-settings";

/**
 * PENGGANTI SEMENTARA untuk API admin. Hanya simulasi di browser: TIDAK ada yang dikirim atau disimpan.
 * Ganti dengan fetch ke backend (simpan pengaturan — FR-ADM-10). Backend wajib memvalidasi ulang.
 */
type Opts = { delayMs?: number; fail?: boolean };

export async function saveSettings(_settings: SettingsForm, { delayMs = 900, fail = false }: Opts = {}) {
  await new Promise((r) => setTimeout(r, delayMs));
  if (fail) throw new Error("simulasi gagal");
}
