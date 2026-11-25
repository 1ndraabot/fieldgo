import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBerandaParams } from '../lib/params.ts';

const HARI_INI = '2026-11-26';

test('parseBerandaParams: tanggal tidak valid jatuh ke hari ini (tanpa melempar)', () => {
  for (const t of ['abc', '', '2026-2-1', '2026-02-31', '2026-13-01', '2026-00-10', undefined]) {
    assert.equal(parseBerandaParams({ tanggal: t }, HARI_INI).tanggal, HARI_INI);
  }
});

test('parseBerandaParams: tanggal lampau → hari ini; tanggal valid dipertahankan', () => {
  assert.equal(parseBerandaParams({ tanggal: '2026-11-01' }, HARI_INI).tanggal, HARI_INI);
  assert.equal(parseBerandaParams({ tanggal: HARI_INI }, HARI_INI).tanggal, HARI_INI);
  assert.equal(parseBerandaParams({ tanggal: '2026-12-01' }, HARI_INI).tanggal, '2026-12-01');
  assert.equal(parseBerandaParams({ tanggal: ['2026-12-02', '2026-12-03'] }, HARI_INI).tanggal, '2026-12-02');
});

test('parseBerandaParams: olahraga kosong atau terlalu panjang diabaikan', () => {
  assert.equal(parseBerandaParams({ olahraga: '   ' }, HARI_INI).olahraga, null);
  assert.equal(parseBerandaParams({ olahraga: 'Futsal' }, HARI_INI).olahraga, 'Futsal');
  assert.equal(parseBerandaParams({ olahraga: 'x'.repeat(51) }, HARI_INI).olahraga, null);
});
