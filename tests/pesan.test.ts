import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../lib/auth/crypto.ts';
import { buatLimiter } from '../lib/auth/ratelimit.ts';
import { masuk, type AuthDeps } from '../lib/auth/service.ts';
import { buatHandlersPesan } from '../lib/pesan/handlers.ts';
import { batasBayar, rincianHarga, tipeHari, validasiPesan, type JamOperasionalPesan, type TarifJam } from '../lib/pesan/rules.ts';
import { PesanSchema } from '../lib/pesan/schema.ts';
import { pesan, type LapanganPesan, type PesanStore } from '../lib/pesan/service.ts';
import { buatMemoryStore as buatAuthMemoryStore } from './helpers/memory-store.ts';

// 18 Nov 2026 = Rabu; 20 Nov = Jumat (weekday), 21 Nov = Sabtu (weekend).
const NOW = new Date('2026-11-18T02:00:00Z'); // 09.00 WIB
const JUMAT = '2026-11-20';
const SABTU = '2026-11-21';

const OPS: JamOperasionalPesan[] = [1, 2, 3, 4, 5, 6, 7].map((hari) => ({ hari, buka: true, jamBuka: 6, jamTutup: 24 }));
const TARIF: TarifJam[] = [
  { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 17, hargaPerJam: 80_000 },
  { tipeHari: 'weekday', jamMulai: 17, jamSelesai: 24, hargaPerJam: 95_000 },
  { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 110_000 },
];
const LAPANGAN: LapanganPesan = { id: 1, nama: 'Futsal Arena A', aktif: true, jamOperasional: OPS, tarif: TARIF };

function buatPesanStore(lapangan: LapanganPesan | null = LAPANGAN, blokir: { jamMulai: number | null; jamSelesai: number | null }[] = []) {
  const tersimpan: { kode: string; jam: number[]; batasBayarPada: Date; totalHarga: number }[] = [];
  const store: PesanStore = {
    async ambilLapangan(id) { return lapangan && lapangan.id === id ? lapangan : null; },
    async jamTerpakai(_lapanganId, _tanggal, now) {
      // Menunggu pembayaran yang lewat batas tidak lagi memegang slot (BR-09).
      return tersimpan.filter((p) => p.batasBayarPada > now).flatMap((p) => p.jam);
    },
    async jamDiblokir() { return blokir; },
    async buat(d) {
      const bentrok = await store.jamTerpakai(d.lapanganId, d.tanggal, d.now);
      if (d.slot.some((s) => bentrok.includes(s.jam))) return null; // cek ulang atomik di store
      tersimpan.push({ kode: d.kode, jam: d.slot.map((s) => s.jam), batasBayarPada: d.batasBayarPada, totalHarga: d.totalHarga });
      return { kode: d.kode };
    },
  };
  return { store, tersimpan };
}

const deps = (store: PesanStore) => ({ store, sekarang: () => NOW });
const pesanDari = (i: Partial<Parameters<typeof pesan>[1]> = {}) =>
  pesan(deps(buatPesanStore().store), { penggunaId: 7, terverifikasi: true, lapanganId: 1, tanggal: JUMAT, mulai: 17, selesai: 20, ...i });

test('rincianHarga: harga lintas rentang tarif dan aturan weekend (AC-05)', () => {
  assert.deepEqual(rincianHarga(TARIF, JUMAT, 16, 19), [
    { jam: 16, harga: 80_000 }, { jam: 17, harga: 95_000 }, { jam: 18, harga: 95_000 },
  ]);
  assert.deepEqual(rincianHarga(TARIF, SABTU, 20, 22), [
    { jam: 20, harga: 110_000 }, { jam: 21, harga: 110_000 },
  ]);
  assert.equal(rincianHarga(TARIF, JUMAT, 5, 7), null); // jam 5 tidak punya tarif
  assert.equal(tipeHari(SABTU), 'weekend');
  assert.equal(tipeHari(JUMAT), 'weekday');
});

test('batasBayar = min(dibuat + 24 jam, jam mulai main) dalam WIB (BR-07)', () => {
  // Dibuat 09.00 WIB untuk main dua hari lagi: batas = +24 jam.
  assert.equal(batasBayar(NOW, '2026-11-20', 8).toISOString(), '2026-11-19T02:00:00.000Z');
  // Dibuat 20.00 WIB untuk main besok 08.00: batas = jam main.
  const malam = new Date('2026-11-18T13:00:00Z');
  assert.equal(batasBayar(malam, '2026-11-19', 8).toISOString(), '2026-11-19T01:00:00.000Z');
});

test('validasiPesan: lapangan, tanggal lampau, jam sudah lewat, tutup, di luar operasional, tarif bolong', () => {
  const i = { lapanganId: 1, tanggal: JUMAT, mulai: 17, selesai: 19 };
  assert.deepEqual(validasiPesan(i, LAPANGAN, NOW), {});
  assert.ok(validasiPesan(i, null, NOW).lapangan);
  assert.equal(validasiPesan(i, { ...LAPANGAN, aktif: false }, NOW).lapangan !== undefined, true);
  assert.ok(validasiPesan({ ...i, tanggal: '2026-11-17' }, LAPANGAN, NOW).tanggal); // kemarin
  assert.ok(validasiPesan({ ...i, tanggal: '2026-11-18', mulai: 9, selesai: 10 }, LAPANGAN, NOW).jam); // 09.00 WIB sudah mulai
  assert.ok(validasiPesan({ ...i, mulai: 5, selesai: 7 }, LAPANGAN, NOW).jam); // di luar 06-24
  assert.ok(validasiPesan({ ...i, mulai: 10, selesai: 10 }, LAPANGAN, NOW).jam); // kosong
  const tutup = validasiPesan(i, { ...LAPANGAN, jamOperasional: OPS.map((o) => (o.hari === 5 ? { ...o, buka: false } : o)) }, NOW);
  assert.match(tutup.jam ?? '', /tutup/);
  assert.ok(validasiPesan({ ...i, mulai: 4, selesai: 6 }, LAPANGAN, NOW).jam); // mulai sebelum buka
  const tanpaTarif: LapanganPesan = { ...LAPANGAN, tarif: [TARIF[1]] }; // hanya 17-24
  assert.match(validasiPesan({ ...i, mulai: 16, selesai: 18 }, tanpaTarif, NOW).jam ?? '', /tarif/);
});

test('pesan: akun belum terverifikasi ditolak (BR-02)', async () => {
  const r = await pesanDari({ terverifikasi: false });
  assert.deepEqual(r, { ok: false, kode: 'BELUM_TERVERIFIKASI' });
});

test('pesan: sukses mengunci harga, membulatkan kode, dan menyimpan slot (FR-ORD-04)', async () => {
  const s = buatPesanStore();
  const r = await pesan(deps(s.store), { penggunaId: 7, terverifikasi: true, lapanganId: 1, tanggal: JUMAT, mulai: 17, selesai: 20 });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.match(r.kode, /^FGO-[2-9A-HJ-NP-Z]{6}$/); // tanpa karakter ambigu
  assert.equal(s.tersimpan.length, 1);
  assert.deepEqual(s.tersimpan[0].jam, [17, 18, 19]);
  assert.equal(s.tersimpan[0].totalHarga, 285_000); // 3 × 95.000
});

test('pesan: slot yang sudah dipegang ditolak; jam lain tetap bisa; blokir admin dihormati', async () => {
  const s = buatPesanStore();
  assert.equal((await pesan(deps(s.store), { penggunaId: 7, terverifikasi: true, lapanganId: 1, tanggal: JUMAT, mulai: 17, selesai: 20 })).ok, true);
  const ulang = await pesan(deps(s.store), { penggunaId: 8, terverifikasi: true, lapanganId: 1, tanggal: JUMAT, mulai: 18, selesai: 21 });
  assert.deepEqual(ulang, { ok: false, kode: 'TIDAK_TERSEDIA' }); // FR-ORD-03 / BR-01
  assert.equal((await pesan(deps(s.store), { penggunaId: 8, terverifikasi: true, lapanganId: 1, tanggal: JUMAT, mulai: 20, selesai: 22 })).ok, true);

  const diblokir = buatPesanStore(LAPANGAN, [{ jamMulai: 8, jamSelesai: 10 }]);
  assert.deepEqual(
    await pesan(deps(diblokir.store), { penggunaId: 7, terverifikasi: true, lapanganId: 1, tanggal: JUMAT, mulai: 9, selesai: 11 }),
    { ok: false, kode: 'TIDAK_TERSEDIA' },
  );
});

test('pesan: validasi bisnis mengembalikan galat per field', async () => {
  const r = await pesanDari({ tanggal: '2026-11-17', mulai: 17, selesai: 19 });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.kode, 'VALIDASI');
  if (r.kode === 'VALIDASI') assert.ok(r.galat.tanggal);
});

// ─── Handler HTTP ───────────────────────────────────────────────────────────

async function siapkanHandler() {
  const authStore = buatAuthMemoryStore();
  const authDeps: AuthDeps = { store: authStore.store, baseUrl: 'http://app.test', sekarang: () => NOW, mailer: { kirim: async () => {} } };
  authStore.users.push(
    { id: 1, nama: 'Rani', email: 'rani@email.com', kataSandi: await hashPassword('Lapangan24!'), nomorKontak: '081234567890', peran: 'penyewa', emailTerverifikasiPada: NOW, dinonaktifkanPada: null },
    { id: 2, nama: 'Baru', email: 'baru@email.com', kataSandi: await hashPassword('Lapangan24!'), nomorKontak: '081234567891', peran: 'penyewa', emailTerverifikasiPada: null, dinonaktifkanPada: null },
  );
  const sesi = async (email: string) => {
    const r = await masuk(authDeps, { email, kataSandi: 'Lapangan24!', peran: 'penyewa' });
    assert.ok(r.ok);
    return (r as { token: string }).token;
  };
  const pesanStore = buatPesanStore();
  const h = buatHandlersPesan({
    store: pesanStore.store, sekarang: () => NOW, auth: authDeps, skema: PesanSchema,
    limiter: { pesan: buatLimiter({ maks: 100, jendelaMs: 60_000, sekarang: () => NOW.getTime() }) },
  });
  return { h, sesi, pesanStore };
}

const req = (body: unknown, token?: string, tipe = 'application/json') => new Request('http://app.test/api/pesan', {
  method: 'POST',
  headers: { 'content-type': tipe, ...(token ? { cookie: `sesi=${token}` } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const BODY = { lapanganId: 1, tanggal: JUMAT, mulai: 17, selesai: 19 };

test('handler pesan: 401 tanpa sesi, 403 belum verifikasi, 415 non-JSON, 400 body salah', async () => {
  const s = await siapkanHandler();
  assert.equal((await s.h.pesan(req(BODY))).status, 401);
  assert.equal((await s.h.pesan(req(BODY, await s.sesi('baru@email.com')))).status, 403);
  assert.equal((await s.h.pesan(req(BODY, await s.sesi('rani@email.com'), 'text/plain'))).status, 415);
  const salah = await s.h.pesan(req({ lapanganId: '1', tanggal: JUMAT, mulai: 17, selesai: 19 }, await s.sesi('rani@email.com')));
  assert.equal(salah.status, 400);
  assert.equal((await salah.json()).kode, 'VALIDASI');
  assert.equal((await s.h.pesan(req('{rusak', await s.sesi('rani@email.com')))).status, 400);
});

test('handler pesan: 201 lalu 409 untuk slot yang sama (anti double booking)', async () => {
  const s = await siapkanHandler();
  const token = await s.sesi('rani@email.com');
  const a = await s.h.pesan(req(BODY, token));
  assert.equal(a.status, 201);
  const b = await a.json();
  assert.equal(b.ok, true);
  assert.match(b.kode, /^FGO-/);
  const c = await s.h.pesan(req(BODY, token));
  assert.equal(c.status, 409);
  assert.equal((await c.json()).kode, 'TIDAK_TERSEDIA');
});
