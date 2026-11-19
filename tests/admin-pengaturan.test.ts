import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  METODE_PEMBAYARAN, normalisasiPengaturan, validasiPengaturan, type InputPengaturan,
} from '../lib/admin/pengaturan/rules.ts';

const VALID: InputPengaturan = {
  rekening: { bank: 'Bank BCA', nomor: '1234 567 890', atasNama: 'FieldGo Sport' },
  batasBayarJam: 24,
  batasPembatalanHari: 1,
  gatewayAktif: true,
  metodeAktif: ['qris', 'gopay'],
};

test('validasiPengaturan: nilai batas 1–72 jam dan 1–7 hari diterima', () => {
  assert.deepEqual(validasiPengaturan(VALID), []);
  assert.deepEqual(validasiPengaturan({ ...VALID, rekening: null, metodeAktif: [] }), []);
  assert.deepEqual(validasiPengaturan({ ...VALID, batasBayarJam: 1, batasPembatalanHari: 7 }), []);
  assert.deepEqual(validasiPengaturan({ ...VALID, batasBayarJam: 72, batasPembatalanHari: 1 }), []);
});

test('validasiPengaturan: batas di luar rentang ditolak', () => {
  for (const jam of [0, 73, 1.5, -1]) assert.ok(validasiPengaturan({ ...VALID, batasBayarJam: jam }).length, `jam ${jam}`);
  for (const hari of [0, 8, 2.5]) assert.ok(validasiPengaturan({ ...VALID, batasPembatalanHari: hari }).length, `hari ${hari}`);
});

test('validasiPengaturan: rekening separuh/rusak dan metode asing ditolak', () => {
  const galat = validasiPengaturan({
    ...VALID,
    rekening: { bank: '', nomor: '12ab', atasNama: '' },
    metodeAktif: ['qris', 'bitcoin'],
  });
  assert.ok(galat.some((g) => g.includes('bank')));
  assert.ok(galat.some((g) => g.includes('Nomor rekening')));
  assert.ok(galat.some((g) => g.includes('pemilik rekening')));
  assert.ok(galat.some((g) => g.includes('bitcoin')));
});

test('normalisasiPengaturan: angka string, metode unik, dan rekening dirapikan', () => {
  const n = normalisasiPengaturan({
    rekening: { bank: ' Bank BCA ', nomor: ' 1234 567 890 ', atasNama: ' FieldGo ' },
    batasBayarJam: '12',
    batasPembatalanHari: '3',
    gatewayAktif: true,
    metodeAktif: ['qris', 'qris', ' gopay ', 5, ''],
  });

  assert.equal(n.batasBayarJam, 12);
  assert.equal(n.batasPembatalanHari, 3);
  assert.equal(n.gatewayAktif, true);
  assert.deepEqual(n.metodeAktif, ['qris', 'gopay']);
  assert.deepEqual(n.rekening, { bank: 'Bank BCA', nomor: '1234 567 890', atasNama: 'FieldGo' });
});

test('normalisasiPengaturan: rekening kosong menjadi null dan gateway hanya true bila boolean true', () => {
  const kosong = normalisasiPengaturan({
    rekening: { bank: '', nomor: '', atasNama: '' },
    batasBayarJam: 24, batasPembatalanHari: 1, gatewayAktif: 'ya',
  });
  assert.equal(kosong.rekening, null);
  assert.equal(kosong.gatewayAktif, false);
  assert.deepEqual(kosong.metodeAktif, []);
});

test('METODE_PEMBAYARAN: kode unik dan seluruhnya dikenal validasi', () => {
  const kode = METODE_PEMBAYARAN.map((m) => m.kode);
  assert.equal(new Set(kode).size, kode.length);
  assert.deepEqual(validasiPengaturan({ ...VALID, metodeAktif: kode }), []);
});
