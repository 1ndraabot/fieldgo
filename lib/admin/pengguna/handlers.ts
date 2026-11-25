import { wajibAdminApi } from '../guard.ts';
import { bacaJson, galatServer, json } from '../http.ts';
import { ubahAktifPengguna, type HasilPengguna } from './service.ts';

const STATUS: Record<string, number> = { MODE_DEMO: 503, TIDAK_DITEMUKAN: 404, VALIDASI: 400 };

function balas<T>(h: HasilPengguna<T>): Response {
  if (h.ok) return json(200, { ok: true, data: h.data });
  return json(STATUS[h.kode] ?? 400, { ok: false, kode: h.kode, pesan: h.pesan });
}

const idDari = (teks: string): number | null => (/^\d{1,9}$/.test(teks) ? Number(teks) : null);

/** POST /api/admin/pengguna/[id]/aktif — hanya admin; target diperiksa di service. */
export async function ubahAktifPenggunaApi(req: Request, idTeks: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;

    const id = idDari(idTeks);
    if (id === null) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

    const baca = await bacaJson(req);
    if (!baca.ok) return baca.respons;
    if (!baca.body || typeof baca.body !== 'object' || Array.isArray(baca.body)) {
      return json(400, { ok: false, kode: 'VALIDASI', pesan: 'Body harus berupa objek JSON.' });
    }

    const body = baca.body as Record<string, unknown>;
    if (typeof body.aktif !== 'boolean') {
      return json(400, { ok: false, kode: 'VALIDASI', pesan: 'Field aktif harus bernilai true atau false.' });
    }

    return balas(await ubahAktifPengguna({ aktorId: admin.pengguna.id, targetId: id, aktif: body.aktif }));
  } catch (e) {
    return galatServer('admin-pengguna', e);
  }
}
