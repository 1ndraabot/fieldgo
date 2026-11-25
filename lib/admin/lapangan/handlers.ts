import { bacaJson, galatServer, json } from '../http.ts';
import { wajibAdminApi } from '../guard.ts';
import { normalisasiLapangan, type AturanTarif, type BarisJam } from './rules.ts';
import {
  hapusFasilitas, hapusJenis, simpanJam, simpanLapangan, simpanTarif,
  tambahFasilitas, tambahJenis, ubahAktifLapangan, ubahFasilitas, ubahJenis,
  type Hasil,
} from './service.ts';

const STATUS: Record<string, number> = {
  MODE_DEMO: 503,
  TIDAK_DITEMUKAN: 404,
  VALIDASI: 400,
  KONFLIK: 409,
};

function balas(h: Hasil<unknown>): Response {
  if (h.ok) return json(200, { ok: true, ...(h.data === undefined ? {} : { data: h.data }) });
  return json(STATUS[h.kode] ?? 400, { ok: false, kode: h.kode, pesan: h.pesan });
}

const idDari = (teks: string): number | null => (/^\d{1,9}$/.test(teks) ? Number(teks) : null);

/** Semua route admin: sesi admin diperiksa sebelum body dibaca. */
function buatHandler<T>(kerjakan: (body: Record<string, unknown>, id: number) => Promise<Hasil<T>>) {
  return async (req: Request, idTeks: string) => {
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
      return balas(await kerjakan(baca.body as Record<string, unknown>, id));
    } catch (e) {
      return galatServer('admin-lapangan', e);
    }
  };
}

/** Handler tanpa id di path (create / master create). */
function buatHandlerBaru<T>(kerjakan: (body: Record<string, unknown>) => Promise<Hasil<T>>) {
  return async (req: Request) => {
    try {
      const admin = await wajibAdminApi(req);
      if (!admin.ok) return admin.respons;

      const baca = await bacaJson(req);
      if (!baca.ok) return baca.respons;
      if (!baca.body || typeof baca.body !== 'object' || Array.isArray(baca.body)) {
        return json(400, { ok: false, kode: 'VALIDASI', pesan: 'Body harus berupa objek JSON.' });
      }
      return balas(await kerjakan(baca.body as Record<string, unknown>));
    } catch (e) {
      return galatServer('admin-lapangan', e);
    }
  };
}

export const handlersLapangan = {
  /** POST /api/admin/lapangan */
  buat: buatHandlerBaru((b) => simpanLapangan(normalisasiLapangan(b))),

  /** PATCH /api/admin/lapangan/[id] */
  ubah: buatHandler((b, id) => simpanLapangan(normalisasiLapangan(b), id)),

  /** POST /api/admin/lapangan/[id]/aktif */
  aktif: buatHandler((b, id) => ubahAktifLapangan(id, b.aktif === true)),

  /** PUT /api/admin/lapangan/[id]/tarif */
  tarif: buatHandler((b, id) => simpanTarif(id, b.aturan as AturanTarif[])),

  /** PUT /api/admin/lapangan/[id]/jam */
  jam: buatHandler((b, id) => simpanJam(id, b.baris as BarisJam[])),

  /** POST /api/admin/jenis-olahraga */
  tambahJenis: buatHandlerBaru((b) => tambahJenis(b.nama)),

  /** PATCH /api/admin/jenis-olahraga/[id] */
  ubahJenis: buatHandler((b, id) => ubahJenis(id, b.nama)),

  /** DELETE /api/admin/jenis-olahraga/[id] */
  hapusJenis: async (req: Request, idTeks: string) => {
    try {
      const admin = await wajibAdminApi(req);
      if (!admin.ok) return admin.respons;
      const id = idDari(idTeks);
      if (id === null) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
      return balas(await hapusJenis(id));
    } catch (e) {
      return galatServer('admin-lapangan', e);
    }
  },

  /** POST /api/admin/fasilitas */
  tambahFasilitas: buatHandlerBaru((b) => tambahFasilitas(b.nama)),

  /** PATCH /api/admin/fasilitas/[id] */
  ubahFasilitas: buatHandler((b, id) => ubahFasilitas(id, b.nama)),

  /** DELETE /api/admin/fasilitas/[id] */
  hapusFasilitas: async (req: Request, idTeks: string) => {
    try {
      const admin = await wajibAdminApi(req);
      if (!admin.ok) return admin.respons;
      const id = idDari(idTeks);
      if (id === null) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
      return balas(await hapusFasilitas(id));
    } catch (e) {
      return galatServer('admin-lapangan', e);
    }
  },
};
