import { cookieHapus, cookieSesi, bacaCookie, NAMA_COOKIE } from './cookie.ts';
import type { Limiter } from './ratelimit.ts';
import { normalisasiEmail, type DaftarInput, type MasukInput } from './rules.ts';
import { SESI_MS, ambilPengguna, daftar, keluar, kirimUlangVerifikasi, masuk, type AuthDeps } from './service.ts';

/** Bentuk minimal yang dipenuhi Zod (`safeParse` + `error.flatten().fieldErrors`). */
export type Skema<T> = {
  safeParse(v: unknown): { success: true; data: T } | { success: false; error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } } };
};
export type HandlerDeps = AuthDeps & {
  secure: boolean;
  skema: { daftar: Skema<DaftarInput>; masuk: Skema<MasukInput> };
  limiter: { masuk: Limiter; daftar: Limiter; kirimUlang: Limiter };
};

const json = (status: number, body: unknown, cookie?: string) => {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (cookie) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
};
const dibatasi = (ulangiDetik: number) => json(429, { ok: false, kode: 'DIBATASI', ulangiDetik });
const ip = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'lokal';

/** Hanya JSON: form lintas-situs tidak bisa mengirim Content-Type ini tanpa preflight (pertahanan CSRF bersama SameSite=Lax). */
async function bacaBody(req: Request): Promise<{ body: unknown } | { res: Response }> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return { res: json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' }) };
  }
  try { return { body: await req.json() }; } catch { return { res: json(400, { ok: false, kode: 'JSON_RUSAK' }) }; }
}

function galatPerField(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  const g: Record<string, string> = {};
  for (const [k, v] of Object.entries(error.flatten().fieldErrors)) if (v?.[0]) g[k] = v[0];
  return g;
}

export function buatHandlers(d: HandlerDeps) {
  const aman = (fn: (req: Request) => Promise<Response>) => async (req: Request) => {
    try { return await fn(req); } catch (e) {
      console.error('[auth] galat tak terduga', e);
      return json(500, { ok: false, kode: 'GALAT_SERVER' }); // detail hanya di log, tidak ke klien
    }
  };
  const tokenSesi = (req: Request) => bacaCookie(req.headers.get('cookie'), NAMA_COOKIE);

  return {
    daftar: aman(async (req) => {
      const batas = d.limiter.daftar.cek(ip(req)); // dihitung sebelum validasi: spam dibatasi apa pun isinya
      if (!batas.diizinkan) return dibatasi(batas.ulangiDetik);
      const b = await bacaBody(req);
      if ('res' in b) return b.res;
      const v = d.skema.daftar.safeParse(b.body);
      if (!v.success) return json(400, { ok: false, kode: 'VALIDASI', galat: galatPerField(v.error) });
      const r = await daftar(d, v.data);
      return r.ok ? json(201, { ok: true }) : json(409, { ok: false, kode: r.kode });
    }),

    masuk: aman(async (req) => {
      const b = await bacaBody(req);
      if ('res' in b) return b.res;
      const v = d.skema.masuk.safeParse(b.body);
      if (!v.success) return json(400, { ok: false, kode: 'VALIDASI', galat: galatPerField(v.error) });
      const kunci = `${ip(req)}|${normalisasiEmail(v.data.email)}`;
      const batas = d.limiter.masuk.cek(kunci);
      if (!batas.diizinkan) return dibatasi(batas.ulangiDetik);
      const r = await masuk(d, { email: v.data.email, kataSandi: v.data.kataSandi, peran: 'penyewa' }); // admin: halaman login terpisah
      if (!r.ok) return r.kode === 'AKUN_NONAKTIF' ? json(403, { ok: false, kode: r.kode }) : json(401, { ok: false, kode: r.kode });
      d.limiter.masuk.reset(kunci);
      return json(200, { ok: true, terverifikasi: r.pengguna.emailTerverifikasiPada !== null }, cookieSesi(r.token, SESI_MS / 1000, d.secure));
    }),

    keluar: aman(async (req) => {
      const b = await bacaBody(req);
      if ('res' in b) return b.res;
      await keluar(d, tokenSesi(req));
      return json(200, { ok: true }, cookieHapus(d.secure));
    }),

    kirimUlang: aman(async (req) => {
      const b = await bacaBody(req);
      if ('res' in b) return b.res;
      const p = await ambilPengguna(d, tokenSesi(req));
      if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
      const batas = d.limiter.kirimUlang.cek(`u:${p.id}`);
      if (!batas.diizinkan) return dibatasi(batas.ulangiDetik);
      return json(200, { ok: true, status: await kirimUlangVerifikasi(d, p.id) });
    }),
  };
}
