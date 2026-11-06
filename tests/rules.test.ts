import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalisasiEmail, normalisasiKontak, validasiNama, validasiEmail, validasiKontak, validasiSandi,
  validasiDaftar, validasiMasuk, kekuatanSandi, inisial, amanNext,
} from '../lib/auth/rules.ts';

test('normalisasi email dan kontak', () => {
  assert.equal(normalisasiEmail('  Rani@Email.COM '), 'rani@email.com');
  assert.equal(normalisasiKontak('0812-3456-7890'), '081234567890');
  assert.equal(normalisasiKontak('+62 812 3456 7890'), '+6281234567890');
});

test('validasi field tunggal', () => {
  assert.equal(validasiNama('R'), 'Nama minimal 2 karakter.');
  assert.equal(validasiNama('Rani Putri'), null);
  assert.equal(validasiEmail(''), 'Email wajib diisi.');
  for (const e of ['abc', 'a@b', 'rani @email.com']) assert.equal(validasiEmail(e), 'Format email tidak valid.', e);
  assert.equal(validasiEmail('rani@email.com'), null);
  assert.equal(validasiKontak(''), 'Nomor kontak wajib diisi.');
  for (const k of ['123', 'abcdefghij']) assert.equal(validasiKontak(k), 'Nomor kontak tidak valid (9–15 digit).', k);
  assert.equal(validasiKontak('0812-3456-7890'), null);
  assert.equal(validasiSandi('abc'), 'Kata sandi minimal 8 karakter.');
  assert.equal(validasiSandi('a'.repeat(129)), 'Kata sandi maksimal 128 karakter.');
  assert.equal(validasiSandi('Lapangan24!'), null);
});

const OK = { nama: 'Rani Putri', email: 'rani@email.com', nomorKontak: '0812-3456-7890', kataSandi: 'Lapangan24!', setuju: true };

test('validasiDaftar mengembalikan hanya field yang salah', () => {
  assert.deepEqual(validasiDaftar(OK), {});
  const g = validasiDaftar({ nama: '', email: 'x', nomorKontak: '1', kataSandi: '1', setuju: false });
  assert.deepEqual(Object.keys(g).sort(), ['email', 'kataSandi', 'nama', 'nomorKontak', 'setuju']);
  assert.equal(g.setuju, 'Kamu perlu menyetujui syarat penggunaan.');
});

test('validasiMasuk: sandi hanya wajib terisi (tanpa aturan panjang)', () => {
  assert.deepEqual(validasiMasuk({ email: 'rani@email.com', kataSandi: 'x' }), {});
  assert.deepEqual(validasiMasuk({ email: '', kataSandi: '' }), { email: 'Email wajib diisi.', kataSandi: 'Kata sandi wajib diisi.' });
});

test('kekuatanSandi mengikuti skor desain', () => {
  assert.deepEqual(kekuatanSandi(''), { skor: 0, label: 'Terlalu pendek', persen: 8, warna: '#E5484D' });
  assert.equal(kekuatanSandi('abcdefgh').label, 'Lemah');
  assert.equal(kekuatanSandi('abcdefg1').label, 'Cukup');
  assert.equal(kekuatanSandi('Abcdefg1').label, 'Kuat');
  assert.deepEqual(kekuatanSandi('Lapangan24!'), { skor: 4, label: 'Sangat kuat', persen: 100, warna: '#0E8A4A' });
});

test('inisial untuk avatar', () => {
  assert.equal(inisial('Rani Putri'), 'RP');
  assert.equal(inisial('rani'), 'R');
  assert.equal(inisial('  budi  santoso  wijaya'), 'BS');
  assert.equal(inisial(''), '?');
});

test('amanNext hanya menerima path internal (cegah open redirect)', () => {
  assert.equal(amanNext('/pesan?lapangan=1&tanggal=2026-11-07'), '/pesan?lapangan=1&tanggal=2026-11-07');
  assert.equal(amanNext('/lapangan/3#kalender'), '/lapangan/3#kalender');
  for (const bad of [undefined, null, '', '//evil.com', 'https://evil.com', '/\\evil.com', '/masuk', '/daftar?x=1', '/api/auth/masuk', '/pesan\nSet-Cookie: a=b', '/' + 'a'.repeat(600)])
    assert.equal(amanNext(bad as string | null | undefined), '/', String(bad).slice(0, 30));
});
