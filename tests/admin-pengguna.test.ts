import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolakUbahAktif, type TargetPengguna } from '../lib/admin/pengguna/rules.ts';

const PENYEWA: TargetPengguna = { id: 2, peran: 'penyewa', dinonaktifkanPada: null };
const NONAKTIF: TargetPengguna = { ...PENYEWA, dinonaktifkanPada: new Date('2026-11-18T02:00:00Z') };
const ADMIN: TargetPengguna = { id: 1, peran: 'admin', dinonaktifkanPada: null };

test('tolakUbahAktif: penyewa boleh dinonaktifkan dan diaktifkan kembali', () => {
  assert.equal(tolakUbahAktif(1, PENYEWA, false), null);
  assert.equal(tolakUbahAktif(1, NONAKTIF, true), null);
});

test('tolakUbahAktif: akun admin tidak dapat diubah statusnya (termasuk diri sendiri)', () => {
  assert.match(tolakUbahAktif(1, ADMIN, false) ?? '', /penyewa/);
  assert.match(tolakUbahAktif(9, ADMIN, false) ?? '', /penyewa/);
  assert.match(tolakUbahAktif(1, ADMIN, true) ?? '', /penyewa/);
});

test('tolakUbahAktif: admin tidak dapat menonaktifkan akunnya sendiri', () => {
  // Bila kelak admin juga boleh diubah, aturan diri sendiri tetap menjadi pengaman.
  const diriAdmin: TargetPengguna = { id: 1, peran: 'penyewa', dinonaktifkanPada: null };
  assert.match(tolakUbahAktif(1, diriAdmin, false) ?? '', /sendiri/);
  assert.equal(tolakUbahAktif(2, diriAdmin, false), null);
});

test('tolakUbahAktif: perubahan yang tidak mengubah status ditolak', () => {
  assert.match(tolakUbahAktif(1, PENYEWA, true) ?? '', /sudah aktif/);
  assert.match(tolakUbahAktif(1, NONAKTIF, false) ?? '', /sudah nonaktif/);
});
