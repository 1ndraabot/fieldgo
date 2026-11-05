import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSlotStatuses, type SlotInput } from '../lib/slots.ts';

// 2026-11-05 09:00 WIB (Kamis). 2026-11-06 Jumat, 2026-11-07 Sabtu.
const NOW = new Date('2026-11-05T02:00:00Z');
const TIAP_HARI = [1, 2, 3, 4, 5, 6, 7].map((hari) => ({ hari, buka: true, jamBuka: 6, jamTutup: 24 }));
const TARIF = [
  { tipeHari: 'weekday' as const, jamMulai: 6, jamSelesai: 24, hargaPerJam: 100000 },
  { tipeHari: 'weekend' as const, jamMulai: 6, jamSelesai: 24, hargaPerJam: 150000 },
];

const base = (o: Partial<SlotInput> = {}): SlotInput => ({
  tanggal: '2026-11-06', now: NOW, lapanganAktif: true,
  jamOperasional: TIAP_HARI, tarif: TARIF, blokir: [], slotAktif: [], ...o,
});
const st = (o: Partial<SlotInput>, jam: number) => computeSlotStatuses(base(o)).find((s) => s.jam === jam)!;
const slot = (jam: number, status: string, batasBayarPada: Date | null = null, tanggal = '2026-11-06') =>
  ({ tanggal, jam, status, batasBayarPada }) as SlotInput['slotAktif'][number];

test('18 slot (06-23), semua tersedia dengan harga weekday bila tidak ada halangan', () => {
  const r = computeSlotStatuses(base());
  assert.equal(r.length, 18);
  assert.equal(r[0].jam, 6);
  assert.equal(r[17].jam, 23);
  assert.ok(r.every((s) => s.status === 'tersedia' && s.harga === 100000));
});

test('Sabtu memakai tarif weekend', () => {
  assert.equal(st({ tanggal: '2026-11-07' }, 10).harga, 150000);
});

test('tarif bisa terbelah per rentang jam', () => {
  const tarif = [
    { tipeHari: 'weekday' as const, jamMulai: 6, jamSelesai: 17, hargaPerJam: 80000 },
    { tipeHari: 'weekday' as const, jamMulai: 17, jamSelesai: 24, hargaPerJam: 120000 },
  ];
  assert.equal(st({ tarif }, 16).harga, 80000);
  assert.equal(st({ tarif }, 17).harga, 120000);
});

test('lapangan nonaktif: semua tidak tersedia', () => {
  assert.ok(computeSlotStatuses(base({ lapanganAktif: false })).every((s) => s.status === 'tidak_tersedia'));
});

test('hari tutup atau tanpa jam operasional: semua tidak tersedia', () => {
  const tutup = TIAP_HARI.map((j) => (j.hari === 5 ? { ...j, buka: false } : j));
  assert.ok(computeSlotStatuses(base({ jamOperasional: tutup })).every((s) => s.status === 'tidak_tersedia'));
  assert.ok(computeSlotStatuses(base({ jamOperasional: [] })).every((s) => s.status === 'tidak_tersedia'));
});

test('di luar jam buka-tutup tidak tersedia', () => {
  const jamOperasional = TIAP_HARI.map((j) => ({ ...j, jamBuka: 8, jamTutup: 22 }));
  assert.equal(st({ jamOperasional }, 7).status, 'tidak_tersedia');
  assert.equal(st({ jamOperasional }, 8).status, 'tersedia');
  assert.equal(st({ jamOperasional }, 21).status, 'tersedia');
  assert.equal(st({ jamOperasional }, 22).status, 'tidak_tersedia');
});

test('jam tanpa tarif tidak boleh dibuka (BR-15)', () => {
  const tarif = [{ tipeHari: 'weekday' as const, jamMulai: 6, jamSelesai: 20, hargaPerJam: 100000 }];
  assert.equal(st({ tarif }, 19).status, 'tersedia');
  assert.equal(st({ tarif }, 20).status, 'tidak_tersedia');
  assert.equal(st({ tarif }, 20).harga, null);
});

test('blokir sehari penuh dan blokir sebagian jam', () => {
  const penuh = { tanggalMulai: '2026-11-05', tanggalSelesai: '2026-11-07', jamMulai: null, jamSelesai: null };
  assert.ok(computeSlotStatuses(base({ blokir: [penuh] })).every((s) => s.status === 'tidak_tersedia'));
  const sebagian = { tanggalMulai: '2026-11-06', tanggalSelesai: '2026-11-06', jamMulai: 10, jamSelesai: 12 };
  assert.equal(st({ blokir: [sebagian] }, 10).status, 'tidak_tersedia');
  assert.equal(st({ blokir: [sebagian] }, 11).status, 'tidak_tersedia');
  assert.equal(st({ blokir: [sebagian] }, 12).status, 'tersedia');
  const laluTanggal = { ...sebagian, tanggalMulai: '2026-11-08', tanggalSelesai: '2026-11-08' };
  assert.equal(st({ blokir: [laluTanggal] }, 10).status, 'tersedia');
});

test('slot yang sudah mulai atau lewat tidak tersedia', () => {
  assert.equal(st({ tanggal: '2026-11-05' }, 9).status, 'tidak_tersedia'); // sekarang 09.00 WIB: sudah mulai
  assert.equal(st({ tanggal: '2026-11-05' }, 10).status, 'tersedia');
  assert.ok(computeSlotStatuses(base({ tanggal: '2026-11-04' })).every((s) => s.status === 'tidak_tersedia'));
});

test('status pesanan menentukan terisi/ditahan', () => {
  const masa = new Date('2026-11-05T10:00:00Z');
  const lalu = new Date('2026-11-05T01:00:00Z');
  const slotAktif = [
    slot(10, 'terkonfirmasi'), slot(11, 'pengajuan_pembatalan'), slot(12, 'menunggu_verifikasi'),
    slot(13, 'menunggu_pembayaran', masa), slot(14, 'menunggu_pembayaran', lalu), slot(15, 'dibatalkan'),
  ];
  const s = (jam: number) => st({ slotAktif }, jam).status;
  assert.deepEqual([s(10), s(11), s(12), s(13), s(14), s(15)],
    ['terisi', 'terisi', 'ditahan', 'ditahan', 'tersedia', 'tersedia']); // 14: lewat batas bayar, pengaman penjadwal
});

test('terisi menang atas ditahan; tidak tersedia menang atas terisi (urutan PRD Bagian 6)', () => {
  assert.equal(st({ slotAktif: [slot(10, 'menunggu_verifikasi'), slot(10, 'terkonfirmasi')] }, 10).status, 'terisi');
  const blokir = [{ tanggalMulai: '2026-11-06', tanggalSelesai: '2026-11-06', jamMulai: 10, jamSelesai: 11 }];
  assert.equal(st({ blokir, slotAktif: [slot(10, 'terkonfirmasi')] }, 10).status, 'tidak_tersedia');
});

test('pesanan di tanggal lain tidak memengaruhi', () => {
  assert.equal(st({ slotAktif: [slot(10, 'terkonfirmasi', null, '2026-11-07')] }, 10).status, 'tersedia');
});
