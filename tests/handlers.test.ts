import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../lib/auth/crypto.ts';
import { buatHandlers, type Skema } from '../lib/auth/handlers.ts';
import { buatLimiter } from '../lib/auth/ratelimit.ts';
import { validasiDaftar, validasiMasuk, type DaftarInput, type MasukInput } from '../lib/auth/rules.ts';
import type { AuthDeps } from '../lib/auth/service.ts';
import { buatMemoryStore } from './helpers/memory-store.ts';

// Skema uji dibuat dari aturan yang sama dengan Zod di produksi (Zod membungkus rules.ts).
const skema = <T extends Record<string, unknown>>(fn: (i: T) => Record<string, string>): Skema<T> => ({
  safeParse(v) {
    if (typeof v !== 'object' || v === null) return { success: false, error: { flatten: () => ({ fieldErrors: { _: ['Body tidak valid'] } }) } };
    const g = fn(v as T);
    return Object.keys(g).length
      ? { success: false, error: { flatten: () => ({ fieldErrors: Object.fromEntries(Object.entries(g).map(([k, m]) => [k, [m]])) }) } }
      : { success: true, data: v as T };
  },
});

async function siapkan() {
  const m = buatMemoryStore();
  const surat: { teks: string }[] = [];
  const t = { now: 1_000_000 };
  const deps: AuthDeps = { store: m.store, baseUrl: 'http://app.test', sekarang: () => new Date(t.now), mailer: { kirim: async (s) => { surat.push(s); } } };
  const h = buatHandlers({
    ...deps, secure: false,
    skema: { daftar: skema<DaftarInput>(validasiDaftar), masuk: skema<MasukInput>(validasiMasuk) },
    limiter: {
      masuk: buatLimiter({ maks: 3, jendelaMs: 600_000, sekarang: () => t.now }),
      daftar: buatLimiter({ maks: 2, jendelaMs: 900_000, sekarang: () => t.now }),
      kirimUlang: buatLimiter({ maks: 1, jendelaMs: 60_000, sekarang: () => t.now }),
    },
  });
  m.users.push({ id: 1, nama: 'Rani', email: 'rani@email.com', kataSandi: await hashPassword('Lapangan24!'), nomorKontak: '081234567890', peran: 'penyewa', emailTerverifikasiPada: null, dinonaktifkanPada: null });
  return { ...m, h, surat, t };
}

const post = (url: string, body: unknown, extra: Record<string, string> = {}) =>
  new Request('http://app.test' + url, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const DAFTAR = { nama: 'Budi Santoso', email: 'budi@email.com', nomorKontak: '0812-1111-2222', kataSandi: 'Lapangan24!', setuju: true };
const LOGIN = { email: 'rani@email.com', kataSandi: 'Lapangan24!' };
const sesiDari = (r: Response) => /sesi=([^;]+)/.exec(r.headers.get('set-cookie') ?? '')?.[1] ?? null;

test('semua endpoint menolak body non-JSON (pertahanan CSRF) dan JSON rusak', async () => {
  const s = await siapkan();
  const form = new Request('http://app.test/x', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'email=a' });
  assert.equal((await s.h.masuk(form)).status, 415);
  assert.equal((await s.h.daftar(form)).status, 415);
  assert.equal((await s.h.masuk(post('/x', '{rusak'))).status, 400);
});

test('masuk: validasi 400 dengan pesan per field', async () => {
  const s = await siapkan();
  const r = await s.h.masuk(post('/api/auth/masuk', { email: 'x', kataSandi: '' }));
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { ok: false, kode: 'VALIDASI', galat: { email: 'Format email tidak valid.', kataSandi: 'Kata sandi wajib diisi.' } });
});

test('masuk: sukses mengatur cookie sesi HttpOnly dan bisa dipakai keluar', async () => {
  const s = await siapkan();
  const r = await s.h.masuk(post('/api/auth/masuk', LOGIN));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, terverifikasi: false });
  const c = r.headers.get('set-cookie')!;
  assert.match(c, /^sesi=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=604800$/);
  const token = sesiDari(r)!;
  const k = await s.h.keluar(post('/api/auth/keluar', {}, { cookie: `sesi=${token}` }));
  assert.equal(k.status, 200);
  assert.match(k.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal(s.sesi.length, 0);
});

test('masuk: 401 untuk sandi salah, 403 untuk akun nonaktif, tanpa cookie', async () => {
  const s = await siapkan();
  const salah = await s.h.masuk(post('/api/auth/masuk', { ...LOGIN, kataSandi: 'salah' }));
  assert.equal(salah.status, 401);
  assert.equal((await salah.json()).kode, 'KREDENSIAL_SALAH');
  assert.equal(salah.headers.get('set-cookie'), null);
  s.users[0].dinonaktifkanPada = new Date();
  const non = await s.h.masuk(post('/api/auth/masuk', LOGIN));
  assert.equal(non.status, 403);
  assert.equal((await non.json()).kode, 'AKUN_NONAKTIF');
});

test('masuk: dibatasi 429 setelah terlalu banyak percobaan (per IP+email), pulih setelah jendela, reset saat sukses', async () => {
  const s = await siapkan();
  const salah = () => s.h.masuk(post('/api/auth/masuk', { ...LOGIN, kataSandi: 'salah' }, { 'x-forwarded-for': '1.2.3.4, 9.9.9.9' }));
  for (let i = 0; i < 3; i++) assert.equal((await salah()).status, 401);
  const r = await salah();
  assert.equal(r.status, 429);
  const b = await r.json();
  assert.equal(b.kode, 'DIBATASI');
  assert.equal(b.ulangiDetik, 600);
  // sandi benar pun tetap ditolak selama dibatasi
  assert.equal((await s.h.masuk(post('/api/auth/masuk', LOGIN, { 'x-forwarded-for': '1.2.3.4' }))).status, 429);
  // IP lain tidak terkena
  assert.equal((await s.h.masuk(post('/api/auth/masuk', LOGIN, { 'x-forwarded-for': '5.6.7.8' }))).status, 200);
  s.t.now += 600_000;
  assert.equal((await s.h.masuk(post('/api/auth/masuk', LOGIN, { 'x-forwarded-for': '1.2.3.4' }))).status, 200);
});

test('daftar: 201 dan email terkirim; 409 bila email sudah ada; 400 bila tidak valid; 429 bila spam', async () => {
  const s = await siapkan();
  const ok = await s.h.daftar(post('/api/auth/daftar', DAFTAR));
  assert.equal(ok.status, 201);
  assert.deepEqual(await ok.json(), { ok: true });
  assert.equal(s.surat.length, 1);
  assert.equal(JSON.stringify(await (await s.h.daftar(post('/api/auth/daftar', { ...DAFTAR, nama: '' }))).json()).includes('VALIDASI'), true);
  const dup = await s.h.daftar(post('/api/auth/daftar', { ...DAFTAR, nama: 'Budi Lain' }, { 'x-forwarded-for': '7.7.7.7' }));
  assert.equal(dup.status, 409);
  assert.equal((await dup.json()).kode, 'EMAIL_DIPAKAI');
  assert.equal((await s.h.daftar(post('/api/auth/daftar', { ...DAFTAR, email: 'c@email.com' }))).status, 429);
});

test('kirim-ulang: 401 tanpa sesi, 200 dengan sesi, lalu dibatasi 60 detik', async () => {
  const s = await siapkan();
  assert.equal((await s.h.kirimUlang(post('/api/auth/kirim-ulang', {}))).status, 401);
  const token = sesiDari(await s.h.masuk(post('/api/auth/masuk', LOGIN)))!;
  const cookie = { cookie: `sesi=${token}` };
  const a = await s.h.kirimUlang(post('/api/auth/kirim-ulang', {}, cookie));
  assert.deepEqual(await a.json(), { ok: true, status: 'terkirim' });
  assert.equal(s.surat.length, 1);
  const b = await s.h.kirimUlang(post('/api/auth/kirim-ulang', {}, cookie));
  assert.equal(b.status, 429);
  assert.equal((await b.json()).ulangiDetik, 60);
});

test('galat tak terduga: 500 generik tanpa membocorkan detail', async () => {
  const s = await siapkan();
  mock.method(console, 'error', () => {});
  s.store.cariPenggunaByEmail = async () => { throw new Error('koneksi db: password=rahasia'); };
  const r = await s.h.masuk(post('/api/auth/masuk', LOGIN));
  assert.equal(r.status, 500);
  const teks = await r.text();
  assert.ok(!teks.includes('rahasia'));
  assert.equal(JSON.parse(teks).kode, 'GALAT_SERVER');
  mock.restoreAll();
});
