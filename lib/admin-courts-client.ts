import type { AdminCourt } from "./admin-courts";

/**
 * PENGGANTI SEMENTARA untuk API admin. Hanya simulasi di browser: TIDAK ada yang dikirim atau disimpan.
 * Ganti dengan fetch ke backend (simpan lapangan + unggah foto, aktif/nonaktif — FR-ADM-02).
 */
type Opts = { delayMs?: number; fail?: boolean };
const run = async ({ delayMs = 900, fail = false }: Opts) => {
  await new Promise((r) => setTimeout(r, delayMs));
  if (fail) throw new Error("simulasi gagal");
};

export const saveCourt = (_court: AdminCourt, o: Opts = {}) => run(o);
export const setCourtActive = (_id: string, _aktif: boolean, o: Opts = {}) => run({ delayMs: 600, ...o });
