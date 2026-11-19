import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisasiBlokir, validasiBlokir, type InputBlokir } from '../lib/admin/blacklist/rules.ts';

const VALID: InputBlokir = {
  lapanganId: 1,
  tanggalMulai: '2026-11-20',
  tanggalSelesai: '2026-11-21',
  seharian: true,
  jamMulai: null,
  jamSelesai: null,
  alasan: 'Perbaikan lampu sorot',
};

test('validasiBlokir: blokir seharian dan berjam valid', () => {
  assert.deepEqual(validasiBlokir(VALID), []);
  assert.deepEqual(validasiBlokir({ ...VALID, seharian: false, jamMulai: 6, jamSelesai: 12 }), []);
  assert.deepEqual(validasiBlokir({ ...VALID, seharian: false, jamMulai: 23, jamSelesai: 24 }), []);
  assert.deepEqual(validasiBlokir({ ...VALID, tanggalSelesai: '2026-11-20' }), []);
});

test('validasiBlokir: tanggal, lapangan, dan jam tidak sah ditolak', () => {
  assert.ok(validasiBlokir({ ...VALID, lapanganId: 0 }).length);
  assert.ok(validasiBlokir({ ...VALID, tanggalMulai: '2026-02-30' }).length);
  assert.ok(validasiBlokir({ ...VALID, tanggalSelesai: '2026-11-19' }).some((g) => g.includes('sebelum')));
  assert.ok(validasiBlokir({ ...VALID, seharian: false, jamMulai: null, jamSelesai: 12 }).length);
  assert.ok(validasiBlokir({ ...VALID, seharian: false, jamMulai: 5, jamSelesai: 12 }).length);
  assert.ok(validasiBlokir({ ...VALID, seharian: false, jamMulai: 12, jamSelesai: 12 }).some((g) => g.includes('setelah')));
  assert.ok(validasiBlokir({ ...VALID, seharian: false, jamMulai: 6, jamSelesai: 25 }).length);
});

test('validasiBlokir: alasan wajib 5–200 karakter', () => {
  assert.ok(validasiBlokir({ ...VALID, alasan: 'x' }).some((g) => g.includes('minimal')));
  assert.ok(validasiBlokir({ ...VALID, alasan: 'x'.repeat(201) }).some((g) => g.includes('maksimal')));
  assert.deepEqual(validasiBlokir({ ...VALID, alasan: '  AC rusak  ' }), []);
});

test('normalisasiBlokir: seharian memaksa jam null, tanggal selesai kosong = tanggal mulai', () => {
  const n = normalisasiBlokir({
    lapanganId: '2', tanggalMulai: '2026-11-20', tanggalSelesai: '',
    seharian: true, jamMulai: '8', jamSelesai: '10', alasan: '  Perbaikan  ',
  });
  assert.deepEqual(n, {
    lapanganId: 2, tanggalMulai: '2026-11-20', tanggalSelesai: '2026-11-20',
    seharian: true, jamMulai: null, jamSelesai: null, alasan: 'Perbaikan',
  });
});

test('normalisasiBlokir: jam string dikonversi saat tidak seharian', () => {
  const n = normalisasiBlokir({
    lapanganId: 1, tanggalMulai: '2026-11-20', tanggalSelesai: '2026-11-22',
    seharian: false, jamMulai: '7', jamSelesai: '23', alasan: 'Turnamen',
  });
  assert.equal(n.jamMulai, 7);
  assert.equal(n.jamSelesai, 23);
  assert.deepEqual(validasiBlokir(n), []);
});
