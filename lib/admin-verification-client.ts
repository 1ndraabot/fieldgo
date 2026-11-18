import type { Decision } from "./admin-verification";

/**
 * PENGGANTI SEMENTARA untuk API admin. Hanya simulasi di browser: TIDAK ada yang dikirim atau disimpan.
 * Ganti dengan fetch ke backend (setujui/tolak bukti — FR-ADM-06; setujui/tolak pembatalan — FR-ADM-07).
 */
type Opts = { delayMs?: number; fail?: boolean };
const run = async ({ delayMs = 900, fail = false }: Opts) => {
  await new Promise((r) => setTimeout(r, delayMs));
  if (fail) throw new Error("simulasi gagal");
};

export const decidePayment = (_kode: string, _d: { result: Decision; reason?: string }, o: Opts = {}) => run(o);
export const decideCancellation = (_kode: string, _d: { result: Decision; note: string; refund: number | null }, o: Opts = {}) => run(o);
