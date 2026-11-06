import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../lib/auth/crypto.ts';
import {
  daftar, masuk, ambilPengguna, keluar, verifikasiEmail, kirimUlangVerifikasi, type AuthDeps, type Pengguna,
} from '../lib/auth/service.ts';
import { buatMemoryStore } from './helpers/memory-store.ts';

const JAM = 3600_000;

function siapkan() {
  const m = buatMemoryStore();
  const surat: { ke: string; subjek: string; teks: string }[] = [];
  const jam = { now: new Date('2026-11-06T10:00:00Z') };
  const deps: AuthDeps = {
    store: m.store, baseUrl: 'http://app.test', sekarang: () => jam.now,
    mailer: { kirim: async (s) => { surat.push(s); } },
  };
  const tokenDariSurat = (i = surat.length - 1) => /token=([A-Za-z0-9_-]+)/.exec(surat[i].teks)![1];
  const tambahPengguna = async (o: Partial<Pengguna> & { email: string; sandi: string }) => {
    const { sandi, ...sisa } = o;
    const u: Pengguna = {
      id: m.users.length + 1, nama: 'Uji', nomorKontak: '081234567890', peran: 'penyewa',
      emailTerverifikasiPada: null, dinonaktifkanPada: null, kataSandi: await hashPassword(sandi), ...sisa,
    };
    m.users.push(u);
    return u;
  };
  return { ...m, deps, surat, jam, tokenDariSurat, tambahPengguna };
}
const DATA = { nama: '  Rani Putri ', email: ' Rani@Email.com ', nomorKontak: '0812-3456-7890', kataSandi: 'Lapangan24!' };

test('daftar: menyimpan pengguna ternormalisasi, sandi di-hash, mengirim tautan verifikasi', async () => {
  const s = siapkan();
  assert.deepEqual(await daftar(s.deps, DATA), { ok: true });
  const u = s.users[0];
  assert.equal(u.email, 'rani@email.com');
  assert.equal(u.nama, 'Rani Putri');
  assert.equal(u.nomorKontak, '081234567890');
  assert.equal(u.peran, 'penyewa');
  assert.equal(u.emailTerverifikasiPada, null);
  assert.ok(u.kataSandi.startsWith('scrypt$') && !u.kataSandi.includes('Lapangan24!'));
  assert.equal(s.surat.length, 1);
  assert.equal(s.surat[0].ke, 'rani@email.com');
  assert.match(s.surat[0].teks, /http:\/\/app\.test\/verifikasi-email\?token=/);
  assert.ok(s.tokens.every((t) => t.tokenHash !== s.tokenDariSurat())); // yang disimpan hanya hash
});

test('daftar: email yang sama (beda huruf besar) ditolak dan tidak mengirim email', async () => {
  const s = siapkan();
  await daftar(s.deps, DATA);
  assert.deepEqual(await daftar(s.deps, { ...DATA, email: 'RANI@email.com' }), { ok: false, kode: 'EMAIL_DIPAKAI' });
  assert.equal(s.users.length, 1);
  assert.equal(s.surat.length, 1);
});

test('daftar: gagal kirim email tidak menggagalkan pendaftaran', async () => {
  const s = siapkan();
  mock.method(console, 'error', () => {});
  s.deps.mailer = { kirim: async () => { throw new Error('smtp mati'); } };
  assert.deepEqual(await daftar(s.deps, DATA), { ok: true });
  assert.equal(s.users.length, 1);
  mock.restoreAll();
});

test('verifikasiEmail: sekali pakai, ditolak bila kedaluwarsa atau asal-asalan', async () => {
  const s = siapkan();
  await daftar(s.deps, DATA);
  const token = s.tokenDariSurat();
  assert.equal(await verifikasiEmail(s.deps, 'ngawur'), 'tidak_valid');
  assert.equal(await verifikasiEmail(s.deps, token), 'ok');
  assert.ok(s.users[0].emailTerverifikasiPada);
  assert.equal(await verifikasiEmail(s.deps, token), 'tidak_valid'); // sekali pakai

  const b = siapkan();
  await daftar(b.deps, DATA);
  b.jam.now = new Date(b.jam.now.getTime() + 25 * JAM);
  assert.equal(await verifikasiEmail(b.deps, b.tokenDariSurat()), 'tidak_valid');
  assert.equal(b.users[0].emailTerverifikasiPada, null);
});

test('masuk: sukses (akun belum terverifikasi tetap boleh masuk) lalu sesi bisa dibaca', async () => {
  const s = siapkan();
  await s.tambahPengguna({ email: 'rani@email.com', sandi: 'Lapangan24!' });
  const r = await masuk(s.deps, { email: 'RANI@email.com', kataSandi: 'Lapangan24!', peran: 'penyewa' });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.pengguna.emailTerverifikasiPada, null);
  assert.equal(r.kedaluwarsa.getTime() - s.jam.now.getTime(), 7 * 24 * JAM);
  assert.ok(s.sesi.every((x) => x.tokenHash !== r.token)); // token sesi tidak disimpan mentah
  assert.equal((await ambilPengguna(s.deps, r.token))?.email, 'rani@email.com');
});

test('masuk: sandi salah, email tak dikenal, dan peran salah memberi jawaban yang sama', async () => {
  const s = siapkan();
  await s.tambahPengguna({ email: 'rani@email.com', sandi: 'Lapangan24!' });
  await s.tambahPengguna({ email: 'admin@email.com', sandi: 'Admin123!', peran: 'admin' });
  const gagal = { ok: false, kode: 'KREDENSIAL_SALAH' };
  assert.deepEqual(await masuk(s.deps, { email: 'rani@email.com', kataSandi: 'salah', peran: 'penyewa' }), gagal);
  assert.deepEqual(await masuk(s.deps, { email: 'tidak@ada.com', kataSandi: 'Lapangan24!', peran: 'penyewa' }), gagal);
  assert.deepEqual(await masuk(s.deps, { email: 'admin@email.com', kataSandi: 'Admin123!', peran: 'penyewa' }), gagal);
  assert.equal((await masuk(s.deps, { email: 'admin@email.com', kataSandi: 'Admin123!', peran: 'admin' })).ok, true);
});

test('masuk: akun nonaktif baru diketahui bila sandi benar (tidak bocor ke penebak)', async () => {
  const s = siapkan();
  await s.tambahPengguna({ email: 'x@email.com', sandi: 'Lapangan24!', dinonaktifkanPada: new Date(0) });
  assert.deepEqual(await masuk(s.deps, { email: 'x@email.com', kataSandi: 'Lapangan24!', peran: 'penyewa' }), { ok: false, kode: 'AKUN_NONAKTIF' });
  assert.deepEqual(await masuk(s.deps, { email: 'x@email.com', kataSandi: 'salah', peran: 'penyewa' }), { ok: false, kode: 'KREDENSIAL_SALAH' });
  assert.equal(s.sesi.length, 0);
});

test('sesi: kedaluwarsa, token ngawur, akun dinonaktifkan sesudah login, dan keluar', async () => {
  const s = siapkan();
  const u = await s.tambahPengguna({ email: 'rani@email.com', sandi: 'Lapangan24!' });
  const r = await masuk(s.deps, { email: 'rani@email.com', kataSandi: 'Lapangan24!', peran: 'penyewa' });
  if (!r.ok) throw new Error('login gagal');
  assert.equal(await ambilPengguna(s.deps, 'ngawur'), null);
  assert.equal(await ambilPengguna(s.deps, null), null);

  u.dinonaktifkanPada = new Date(); // admin menonaktifkan saat sesi masih hidup
  assert.equal(await ambilPengguna(s.deps, r.token), null);
  u.dinonaktifkanPada = null;
  assert.ok(await ambilPengguna(s.deps, r.token));

  await keluar(s.deps, r.token);
  assert.equal(await ambilPengguna(s.deps, r.token), null);

  const r2 = await masuk(s.deps, { email: 'rani@email.com', kataSandi: 'Lapangan24!', peran: 'penyewa' });
  if (!r2.ok) throw new Error('login gagal');
  s.jam.now = new Date(s.jam.now.getTime() + 8 * 24 * JAM);
  assert.equal(await ambilPengguna(s.deps, r2.token), null);
});

test('kirimUlangVerifikasi: tautan lama gugur, tautan baru berlaku; sudah terverifikasi tidak dikirim lagi', async () => {
  const s = siapkan();
  await daftar(s.deps, DATA);
  const lama = s.tokenDariSurat();
  assert.equal(await kirimUlangVerifikasi(s.deps, 1), 'terkirim');
  assert.equal(s.surat.length, 2);
  const baru = s.tokenDariSurat();
  assert.equal(await verifikasiEmail(s.deps, lama), 'tidak_valid');
  assert.equal(await verifikasiEmail(s.deps, baru), 'ok');
  assert.equal(await kirimUlangVerifikasi(s.deps, 1), 'sudah_terverifikasi');
  assert.equal(s.surat.length, 2);
  assert.equal(await kirimUlangVerifikasi(s.deps, 99), 'tidak_ada');
});
