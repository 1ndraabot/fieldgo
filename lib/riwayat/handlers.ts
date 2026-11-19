import { bacaCookie, NAMA_COOKIE } from '../auth/cookie.ts';
import type { Skema } from '../auth/handlers.ts';
import type { Limiter } from '../auth/ratelimit.ts';
import { ambilPengguna, type AuthDeps } from '../auth/service.ts';
import type { AjuanInput } from './rules.ts';
import { ajukanPembatalan, type RiwayatStore } from './service.ts';

export type RiwayatHandlerDeps = {
  store: RiwayatStore;
  sekarang: () => Date;
  batasPembatalanHari?: () => Promise<number>;
  auth: AuthDeps;
  skema: Skema<AjuanInput>;
  limiter: { ajuan: Limiter };
};

const KODE = /^[A-Za-z0-9-]{4,40}$/;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const STATUS = { TIDAK_DITEMUKAN: 404, STATUS_BERUBAH: 409, LEWAT_BATAS: 409, SUDAH_DIAJUKAN: 409 } as const;

function galatPerField(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  const g: Record<string, string> = {};
  for (const [k, v] of Object.entries(error.flatten().fieldErrors)) if (v?.[0]) g[k] = v[0];
  return g;
}

export function buatHandlersRiwayat(d: RiwayatHandlerDeps) {
  return {
    /** POST /api/pesanan/{kode}/batal-ajuan — pengajuan pembatalan pesanan Terkonfirmasi (FR-CAN-01…04). */
    ajukan: async (req: Request, kode: string) => {
      try {
        if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
          return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' }); // pertahanan CSRF bersama SameSite=Lax
        }
        const p = await ambilPengguna(d.auth, bacaCookie(req.headers.get('cookie'), NAMA_COOKIE));
        if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
        if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

        const batas = d.limiter.ajuan.cek(`u:${p.id}`);
        if (!batas.diizinkan) return json(429, { ok: false, kode: 'DIBATASI', ulangiDetik: batas.ulangiDetik });

        let body: unknown;
        try { body = await req.json(); } catch { return json(400, { ok: false, kode: 'JSON_RUSAK' }); }
        const v = d.skema.safeParse(body);
        if (!v.success) return json(400, { ok: false, kode: 'VALIDASI', galat: galatPerField(v.error) });

        const r = await ajukanPembatalan(d, {
          penggunaId: p.id, kode, namaPemesan: p.nama, kontak: p.nomorKontak, ajuan: v.data,
        });
        if (r.ok) return json(200, { ok: true });
        if (r.kode === 'VALIDASI') return json(400, { ok: false, kode: r.kode, galat: r.galat });
        return json(STATUS[r.kode], { ok: false, kode: r.kode });
      } catch (e) {
        console.error('[riwayat] galat tak terduga', e);
        return json(500, { ok: false, kode: 'GALAT_SERVER' }); // detail hanya di log
      }
    },
  };
}
