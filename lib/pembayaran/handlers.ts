import { bacaCookie, NAMA_COOKIE } from '../auth/cookie.ts';
import type { Limiter } from '../auth/ratelimit.ts';
import { ambilPengguna, type AuthDeps } from '../auth/service.ts';
import { MAKS_BYTES } from '../berkas.ts';
import { batalkanPesanan, unggahBukti, type PembayaranDeps } from './service.ts';

export type PembayaranHandlerDeps = PembayaranDeps & { auth: AuthDeps; limiter: { unggah: Limiter } };

const KODE = /^[A-Za-z0-9-]{4,40}$/;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const STATUS = { TIDAK_DITEMUKAN: 404, STATUS_BERUBAH: 409, KEDALUWARSA: 410, KOSONG: 400, TERLALU_BESAR: 413, TIPE_TIDAK_DIDUKUNG: 415 } as const;

export function buatHandlersPembayaran(d: PembayaranHandlerDeps) {
  const aman = (fn: (req: Request, kode: string) => Promise<Response>) => async (req: Request, kode: string) => {
    try { return await fn(req, kode); } catch (e) {
      console.error('[pembayaran] galat tak terduga', e);
      return json(500, { ok: false, kode: 'GALAT_SERVER' }); // detail hanya di log
    }
  };
  const penggunaDari = (req: Request) => ambilPengguna(d.auth, bacaCookie(req.headers.get('cookie'), NAMA_COOKIE));
  const tipe = (req: Request) => req.headers.get('content-type')?.toLowerCase() ?? '';

  return {
    bukti: aman(async (req, kode) => {
      const p = await penggunaDari(req);
      if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
      if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
      if (!tipe(req).startsWith('multipart/form-data')) return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' });
      if (Number(req.headers.get('content-length') ?? 0) > MAKS_BYTES + 64 * 1024) return json(413, { ok: false, kode: 'TERLALU_BESAR' }); // sebelum body dibaca
      const batas = d.limiter.unggah.cek(`u:${p.id}`);
      if (!batas.diizinkan) return json(429, { ok: false, kode: 'DIBATASI', ulangiDetik: batas.ulangiDetik });

      const berkas = (await req.formData()).get('berkas');
      if (!(berkas instanceof Blob)) return json(400, { ok: false, kode: 'BERKAS_HILANG' });
      const r = await unggahBukti(d, { penggunaId: p.id, kode, isi: new Uint8Array(await berkas.arrayBuffer()) });
      return r.ok ? json(200, { ok: true }) : json(STATUS[r.kode], { ok: false, kode: r.kode });
    }),

    batal: aman(async (req, kode) => {
      const p = await penggunaDari(req);
      if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
      if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
      if (!tipe(req).startsWith('application/json')) return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' }); // pertahanan CSRF bersama SameSite=Lax
      const r = await batalkanPesanan(d, { penggunaId: p.id, kode });
      return r.ok ? json(200, { ok: true }) : json(STATUS[r.kode], { ok: false, kode: r.kode });
    }),
  };
}
