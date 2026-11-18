import { bacaCookie, NAMA_COOKIE } from '../auth/cookie.ts';
import type { Skema } from '../auth/handlers.ts';
import type { Limiter } from '../auth/ratelimit.ts';
import { ambilPengguna, type AuthDeps } from '../auth/service.ts';
import type { PesanInput } from './rules.ts';
import { pesan, type PesanStore } from './service.ts';

export type PesanHandlerDeps = {
  store: PesanStore;
  sekarang: () => Date;
  auth: AuthDeps;
  skema: Skema<PesanInput>;
  limiter: { pesan: Limiter };
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function galatPerField(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  const g: Record<string, string> = {};
  for (const [k, v] of Object.entries(error.flatten().fieldErrors)) if (v?.[0]) g[k] = v[0];
  return g;
}

export function buatHandlersPesan(d: PesanHandlerDeps) {
  return {
    pesan: async (req: Request) => {
      try {
        if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
          return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' }); // pertahanan CSRF bersama SameSite=Lax
        }
        const p = await ambilPengguna(d.auth, bacaCookie(req.headers.get('cookie'), NAMA_COOKIE));
        if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
        if (p.peran !== 'penyewa') return json(403, { ok: false, kode: 'BUKAN_PENYEWA' });

        const batas = d.limiter.pesan.cek(`u:${p.id}`);
        if (!batas.diizinkan) return json(429, { ok: false, kode: 'DIBATASI', ulangiDetik: batas.ulangiDetik });

        let body: unknown;
        try { body = await req.json(); } catch { return json(400, { ok: false, kode: 'JSON_RUSAK' }); }
        const v = d.skema.safeParse(body);
        if (!v.success) return json(400, { ok: false, kode: 'VALIDASI', galat: galatPerField(v.error) });

        const r = await pesan(d, { ...v.data, penggunaId: p.id, terverifikasi: p.emailTerverifikasiPada !== null });
        if (r.ok) return json(201, { ok: true, kode: r.kode });
        if (r.kode === 'VALIDASI') return json(400, { ok: false, kode: r.kode, galat: r.galat });
        if (r.kode === 'BELUM_TERVERIFIKASI') return json(403, { ok: false, kode: r.kode });
        return json(409, { ok: false, kode: r.kode }); // TIDAK_TERSEDIA: slot baru saja diambil (FR-ORD-03)
      } catch (e) {
        console.error('[pesan] galat tak terduga', e);
        return json(500, { ok: false, kode: 'GALAT_SERVER' }); // detail hanya di log
      }
    },
  };
}
