import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah, formatJam, formatRentang, wibSekarang, hariKe, tambahHari, labelPendek, labelPanjang,
} from '../lib/format.ts';

test('formatRupiah memakai titik ribuan', () => {
  assert.equal(formatRupiah(150000), 'Rp 150.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(1250000), 'Rp 1.250.000');
});

test('formatJam dua digit dengan titik', () => {
  assert.equal(formatJam(6), '06.00');
  assert.equal(formatJam(23), '23.00');
});

test('formatRentang dari jam mulai yang berurutan', () => {
  assert.equal(formatRentang([20, 21]), '20.00–22.00 · 2 jam');
  assert.equal(formatRentang([23]), '23.00–24.00 · 1 jam');
  assert.equal(formatRentang([]), 'Pilih jam main');
});

test('wibSekarang menggeser tanggal bila UTC+7 melewati tengah malam', () => {
  assert.deepEqual(wibSekarang(new Date('2026-11-05T17:30:00Z')), { tanggal: '2026-11-06', jam: 0 });
  assert.deepEqual(wibSekarang(new Date('2026-11-05T05:59:00Z')), { tanggal: '2026-11-05', jam: 12 });
});

test('hariKe ISO: Senin=1 sampai Minggu=7', () => {
  assert.equal(hariKe('2026-11-02'), 1);
  assert.equal(hariKe('2026-11-07'), 6);
  assert.equal(hariKe('2026-11-08'), 7);
});

test('tambahHari melewati batas bulan', () => {
  assert.equal(tambahHari('2026-11-30', 1), '2026-12-01');
  assert.equal(tambahHari('2026-11-05', -30), '2026-10-06');
});

test('label tanggal bahasa Indonesia', () => {
  assert.equal(labelPendek('2026-11-07'), 'Sab, 7 Nov');
  assert.equal(labelPanjang('2026-11-07'), 'Sabtu, 7 November');
});
