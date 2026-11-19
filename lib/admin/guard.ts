import type { Pengguna } from '../auth/service.ts';
import { adminDari, penggunaDari } from '../auth/session.ts';
import { json } from './http.ts';

export type AdminApi =
  | { ok: true; pengguna: Pengguna }
  | { ok: false; respons: Response };

/**
 * Guard route API admin (bukan halaman). Tidak memakai redirect:
 * 401 = belum login / sesi gugur, 403 = login tetapi bukan admin.
 * `pengguna` di sini selalu berasal dari sesi server, tidak pernah dari body/query.
 */
export async function wajibAdminApi(req: Request): Promise<AdminApi> {
  const p = await adminDari(req);
  if (!p) {
    // Bedakan belum login vs penyewa agar UI bisa mengarahkan dengan benar.
    const siapa = await penggunaDari(req);
    return {
      ok: false,
      respons: siapa
        ? json(403, { ok: false, kode: 'BUKAN_ADMIN' })
        : json(401, { ok: false, kode: 'TIDAK_LOGIN' }),
    };
  }
  return { ok: true, pengguna: p };
}
