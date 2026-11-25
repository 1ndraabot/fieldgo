import { wajibAdminApi } from '../guard.ts';
import { bacaJson, galatServer, json } from '../http.ts';
import {
  buatRefund, putuskanPembatalan, selesaikanRefundManual, sinkronkan, tinjauPembayaran,
  type HasilPengecualian, type PengecualianDeps,
} from './service.ts';

const STATUS: Record<string, number> = {
  MODE_DEMO: 503,
  TIDAK_DITEMUKAN: 404,
  VALIDASI: 400,
  STATUS_BERUBAH: 409,
  SLOT_TERPAKAI: 409,
  SUDAH_ADA_REFUND: 409,
  BELUM_ADA_INFO: 409,
  GATEWAY_GAGAL: 502,
  GATEWAY_TIDAK_TERJANGKAU: 502,
};

function balas<T>(h: HasilPengecualian<T>): Response {
  if (h.ok) return json(200, { ok: true, ...(h.data === undefined ? {} : { data: h.data }) });
  return json(STATUS[h.kode] ?? 400, { ok: false, kode: h.kode, pesan: h.pesan });
}

const KODE = /^[A-Za-z0-9-]{4,40}$/;

async function bacaObjek(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; respons: Response }> {
  const baca = await bacaJson(req);
  if (!baca.ok) return baca;
  if (!baca.body || typeof baca.body !== 'object' || Array.isArray(baca.body)) {
    return { ok: false, respons: json(400, { ok: false, kode: 'VALIDASI', pesan: 'Body harus berupa objek JSON.' }) };
  }
  return { ok: true, body: baca.body as Record<string, unknown> };
}

/** POST /api/admin/pembayaran/[kode]/tinjau — terima atau refund pembayaran bermasalah. */
export async function tinjauPembayaranApi(d: PengecualianDeps, req: Request, kode: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;
    if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

    const baca = await bacaObjek(req);
    if (!baca.ok) return baca.respons;

    return balas(await tinjauPembayaran(d, {
      kode,
      aksi: baca.body.aksi as 'terima' | 'refund',
      catatan: typeof baca.body.catatan === 'string' ? baca.body.catatan : '',
      adminId: admin.pengguna.id,
    }));
  } catch (e) {
    return galatServer('admin-pengecualian', e);
  }
}

/** POST /api/admin/pembayaran/[kode]/sinkron — tarik status gateway lalu proses seperti webhook. */
export async function sinkronkanApi(d: PengecualianDeps, req: Request, kode: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;
    if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
    return balas(await sinkronkan(d, kode));
  } catch (e) {
    return galatServer('admin-pengecualian', e);
  }
}

/** POST /api/admin/verifikasi/batal/[kode] — putuskan pengajuan pembatalan penyewa. */
export async function putuskanPembatalanApi(d: PengecualianDeps, req: Request, kode: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;
    if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

    const baca = await bacaObjek(req);
    if (!baca.ok) return baca.respons;

    const nominal = baca.body.nominalRefund;
    return balas(await putuskanPembatalan(d, {
      kode,
      aksi: baca.body.aksi as 'setujui' | 'tolak',
      catatan: typeof baca.body.catatan === 'string' ? baca.body.catatan : '',
      nominalRefund: typeof nominal === 'number' && Number.isInteger(nominal) && nominal > 0 ? nominal : null,
      adminId: admin.pengguna.id,
    }));
  } catch (e) {
    return galatServer('admin-pengecualian', e);
  }
}

/** POST /api/admin/refund/[kode] — buat refund baru (gateway atau catatan manual). */
export async function buatRefundApi(d: PengecualianDeps, req: Request, kode: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;
    if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

    const baca = await bacaObjek(req);
    if (!baca.ok) return baca.respons;

    return balas(await buatRefund(d, {
      kode,
      nominal: baca.body.nominal as number,
      alasan: typeof baca.body.alasan === 'string' ? baca.body.alasan : '',
      cara: baca.body.cara as 'gateway' | 'manual',
      catatan: typeof baca.body.catatan === 'string' ? baca.body.catatan : null,
      adminId: admin.pengguna.id,
    }));
  } catch (e) {
    return galatServer('admin-pengecualian', e);
  }
}

/** POST /api/admin/refund/[kode]/selesaikan — tandai refund manual sudah ditransfer. */
export async function selesaikanRefundApi(d: PengecualianDeps, req: Request, kode: string): Promise<Response> {
  try {
    const admin = await wajibAdminApi(req);
    if (!admin.ok) return admin.respons;
    if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

    const baca = await bacaObjek(req);
    if (!baca.ok) return baca.respons;

    const id = baca.body.refundId;
    return balas(await selesaikanRefundManual(d, {
      kode,
      refundId: typeof id === 'number' && Number.isInteger(id) ? id : -1,
      catatan: typeof baca.body.catatan === 'string' ? baca.body.catatan : '',
      adminId: admin.pengguna.id,
    }));
  } catch (e) {
    return galatServer('admin-pengecualian', e);
  }
}
