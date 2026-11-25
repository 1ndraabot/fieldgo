import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HARI, jamTerbuka, jamTanpaTarif, normalisasiLapangan, tipeHariDari,
  validasiJamOperasional, validasiLapangan, validasiTarif,
  type AturanTarif, type BarisJam, type InputLapangan,
} from '../lib/admin/lapangan/rules.ts';

const STANDAR: BarisJam[] = HARI.map((hari) => ({ hari, buka: true, jamBuka: 6, jamTutup: 24 }));

const TARIF_PENUH: AturanTarif[] = [
  { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 90_000 },
  { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 110_000 },
];

const LAPANGAN: InputLapangan = {
  nama: 'Futsal Arena B', jenisOlahragaId: 1, deskripsi: 'Indoor', alamat: 'Jl. Uji 1',
  latitude: -6.9, longitude: 110.4, fasilitasIds: [1, 2], aktif: true,
};

// ─── Cakupan jam ────────────────────────────────────────────────────────────

test('jamTerbuka: hanya jam hari buka untuk tipe hari yang sesuai', () => {
  assert.equal(tipeHariDari(5), 'weekday');
  assert.equal(tipeHariDari(6), 'weekend');

  const baris: BarisJam[] = [
    { hari: 1, buka: true, jamBuka: 8, jamTutup: 10 },
    { hari: 2, buka: true, jamBuka: 6, jamTutup: 8 },
    { hari: 6, buka: false, jamBuka: 6, jamTutup: 24 },
    { hari: 7, buka: true, jamBuka: 9, jamTutup: 11 },
  ];
  assert.deepEqual(jamTerbuka(baris, 'weekday'), [6, 7, 8, 9]);
  assert.deepEqual(jamTerbuka(baris, 'weekend'), [9, 10]);
});

test('jamTanpaTarif: hari tutup tidak menuntut tarif', () => {
  const baris: BarisJam[] = STANDAR.map((b) => (b.hari >= 6 ? { ...b, buka: false } : b));
  assert.deepEqual(jamTanpaTarif([{ tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 50_000 }], baris), []);
  assert.equal(jamTanpaTarif([], baris).length, 18);
});

// ─── Tarif ──────────────────────────────────────────────────────────────────

test('validasiTarif: menutup seluruh jam operasional tanpa tumpang tindih', () => {
  assert.deepEqual(validasiTarif(TARIF_PENUH, STANDAR), []);

  const bertingkat: AturanTarif[] = [
    { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 18, hargaPerJam: 80_000 },
    { tipeHari: 'weekday', jamMulai: 18, jamSelesai: 24, hargaPerJam: 120_000 },
    { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 130_000 },
  ];
  assert.deepEqual(validasiTarif(bertingkat, STANDAR), []);
});

test('validasiTarif: menolak tumpang tindih, celah, harga nol, dan rentang terbalik', () => {
  const tumpang: AturanTarif[] = [
    ...TARIF_PENUH.filter((t) => t.tipeHari === 'weekend'),
    { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 12, hargaPerJam: 80_000 },
    { tipeHari: 'weekday', jamMulai: 11, jamSelesai: 24, hargaPerJam: 90_000 },
  ];
  assert.ok(validasiTarif(tumpang, STANDAR).some((g) => g.includes('tumpang tindih')));

  const celah: AturanTarif[] = [
    ...TARIF_PENUH.filter((t) => t.tipeHari === 'weekend'),
    { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 12, hargaPerJam: 80_000 },
    { tipeHari: 'weekday', jamMulai: 13, jamSelesai: 24, hargaPerJam: 90_000 },
  ];
  assert.ok(validasiTarif(celah, STANDAR).some((g) => g.includes('belum tertutup tarif')));

  assert.ok(validasiTarif([{ ...TARIF_PENUH[0], hargaPerJam: 0 }, TARIF_PENUH[1]], STANDAR).some((g) => g.includes('harga')));
  assert.ok(validasiTarif([{ ...TARIF_PENUH[0], jamMulai: 20, jamSelesai: 10 }, TARIF_PENUH[1]], STANDAR).some((g) => g.includes('lebih awal')));
  assert.ok(validasiTarif([{ ...TARIF_PENUH[0], jamSelesai: 25 }, TARIF_PENUH[1]], STANDAR).some((g) => g.includes('jam selesai')));
});

test('validasiTarif: lapangan tutup penuh boleh tanpa tarif', () => {
  const tutup = STANDAR.map((b) => ({ ...b, buka: false }));
  assert.deepEqual(validasiTarif([], tutup), []);
});

// ─── Jam operasional ────────────────────────────────────────────────────────

test('validasiJamOperasional: standar 7 hari valid, hari tutup diperbolehkan', () => {
  assert.deepEqual(validasiJamOperasional(STANDAR, TARIF_PENUH), []);
  const mingguTutup = STANDAR.map((b) => (b.hari === 7 ? { ...b, buka: false } : b));
  assert.deepEqual(validasiJamOperasional(mingguTutup, TARIF_PENUH), []);
});

test('validasiJamOperasional: menolak jam yang menyisakan tarif bolong dan baris tidak lengkap', () => {
  const tarifSempit = [
    { tipeHari: 'weekday' as const, jamMulai: 8, jamSelesai: 24, hargaPerJam: 90_000 },
    { tipeHari: 'weekend' as const, jamMulai: 6, jamSelesai: 24, hargaPerJam: 110_000 },
  ];
  assert.ok(validasiJamOperasional(STANDAR, tarifSempit).some((g) => g.includes('tanpa tarif')));

  assert.equal(validasiJamOperasional(STANDAR.slice(0, 6), TARIF_PENUH).length > 0, true);
  const ganda = [...STANDAR.slice(0, 6), { ...STANDAR[0] }];
  assert.ok(validasiJamOperasional(ganda, TARIF_PENUH).some((g) => g.includes('ganda') || g.includes('tepat satu kali')));

  const terbalik = STANDAR.map((b) => (b.hari === 2 ? { ...b, jamBuka: 20, jamTutup: 20 } : b));
  assert.ok(validasiJamOperasional(terbalik, TARIF_PENUH).some((g) => g.includes('lebih awal')));
});

// ─── Lapangan ───────────────────────────────────────────────────────────────

test('validasiLapangan: nama, jenis, koordinat, dan fasilitas diperiksa', () => {
  assert.deepEqual(validasiLapangan(LAPANGAN), []);
  assert.ok(validasiLapangan({ ...LAPANGAN, nama: 'ab' }).some((g) => g.includes('minimal 3')));
  assert.ok(validasiLapangan(LAPANGAN, { namaDipakai: true }).some((g) => g.includes('sudah dipakai')));
  assert.ok(validasiLapangan({ ...LAPANGAN, jenisOlahragaId: 0 }).some((g) => g.includes('Jenis olahraga')));
  assert.ok(validasiLapangan({ ...LAPANGAN, latitude: null }).some((g) => g.includes('berdua')));
  assert.ok(validasiLapangan({ ...LAPANGAN, latitude: 91 }).some((g) => g.includes('Latitude')));
  assert.ok(validasiLapangan({ ...LAPANGAN, longitude: -181 }).some((g) => g.includes('Longitude')));
  assert.ok(validasiLapangan({ ...LAPANGAN, fasilitasIds: [1, 1] }).some((g) => g.includes('dua kali')));
  assert.deepEqual(validasiLapangan({ ...LAPANGAN, latitude: null, longitude: null }), []); // kosong berdua boleh
});

test('normalisasiLapangan: angka string dan kolom kosong dirapikan', () => {
  const i = normalisasiLapangan({
    nama: '  Futsal Arena B  ', jenisOlahragaId: '3', deskripsi: '  ', alamat: '  Jl. Uji ',
    latitude: '-6.9', longitude: 110.4, fasilitasIds: [1, '2'], aktif: false,
  });
  assert.equal(i.nama, 'Futsal Arena B');
  assert.equal(i.jenisOlahragaId, 3);
  assert.equal(i.deskripsi, null);
  assert.equal(i.alamat, 'Jl. Uji');
  assert.equal(i.latitude, -6.9);
  assert.equal(i.longitude, 110.4);
  assert.deepEqual(i.fasilitasIds, [1, 2]);
  assert.equal(i.aktif, false);
});
