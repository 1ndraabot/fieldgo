import { bacaJson, galatServer, json } from '../http.ts';
import { wajibAdminApi } from '../guard.ts';
import { normalisasiPengaturan } from './rules.ts';
import { simpanPengaturan } from './service.ts';

/** POST /api/admin/pengaturan — simpan rekening, batas waktu, dan sakelar gateway. */
export async function simpanPengaturanApi(req: Request): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;

    const baca = await bacaJson(req);
    if (!baca.ok) return baca.respons;
    if (!baca.body || typeof baca.body !== 'object' || Array.isArray(baca.body)) {
      return json(400, { ok: false, kode: 'VALIDASI', pesan: 'Body harus berupa objek JSON.' });
    }

    const h = await simpanPengaturan(normalisasiPengaturan(baca.body as Record<string, unknown>));
    if (!h.ok) {
      return json(h.kode === 'MODE_DEMO' ? 503 : 400, { ok: false, kode: h.kode, pesan: h.pesan });
    }
    return json(200, { ok: true, data: h.data });
  } catch (e) {
    return galatServer('admin-pengaturan', e);
  }
}
