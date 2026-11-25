import { wajibAdminApi } from '../guard.ts';
import { bacaJson, galatServer, json } from '../http.ts';
import { normalisasiBlokir } from './rules.ts';
import { cekBlokir, hapusBlokir, simpanBlokir, type HasilBlokir } from './service.ts';

const STATUS: Record<string, number> = {
  MODE_DEMO: 503,
  TIDAK_DITEMUKAN: 404,
  VALIDASI: 400,
  KONFLIK: 409,
};

function balas<T>(h: HasilBlokir<T>): Response {
  if (h.ok) return json(200, { ok: true, data: h.data });
  return json(STATUS[h.kode] ?? 400, { ok: false, kode: h.kode, pesan: h.pesan, ...(h.bentrok ? { bentrok: h.bentrok } : {}) });
}

async function bacaObjek(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; respons: Response }> {
  const baca = await bacaJson(req);
  if (!baca.ok) return baca;
  if (!baca.body || typeof baca.body !== 'object' || Array.isArray(baca.body)) {
    return { ok: false, respons: json(400, { ok: false, kode: 'VALIDASI', pesan: 'Body harus berupa objek JSON.' }) };
  }
  return { ok: true, body: baca.body as Record<string, unknown> };
}

const idDari = (teks: string): number | null => (/^\d{1,9}$/.test(teks) ? Number(teks) : null);

/** POST /api/admin/blacklist — simpan blokir (dengan konfirmasi bentrok). */
export async function simpanBlokirApi(req: Request): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;

    const baca = await bacaObjek(req);
    if (!baca.ok) return baca.respons;

    const h = await simpanBlokir(
      normalisasiBlokir(baca.body),
      admin.pengguna.id,
      baca.body.abaikanBentrok === true,
    );
    return balas(h);
  } catch (e) {
    return galatServer('admin-blacklist', e);
  }
}

/** POST /api/admin/blacklist/cek — periksa bentrok tanpa menyimpan. */
export async function cekBlokirApi(req: Request): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;

    const baca = await bacaObjek(req);
    if (!baca.ok) return baca.respons;

    const h = await cekBlokir(normalisasiBlokir(baca.body));
    if (h.ok) return json(200, { ok: true, bentrok: h.data });
    return balas(h);
  } catch (e) {
    return galatServer('admin-blacklist', e);
  }
}

/** DELETE /api/admin/blacklist/[id] — hapus blokir; slot langsung dapat dipesan lagi. */
export async function hapusBlokirApi(req: Request, idTeks: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;

    const id = idDari(idTeks);
    if (id === null) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

    return balas(await hapusBlokir(id));
  } catch (e) {
    return galatServer('admin-blacklist', e);
  }
}
