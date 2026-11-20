import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/env.ts'; // WAJIB paling atas: isi DATABASE_URL sebelum modul demo.ts membacanya.
import {
  bolehTerima, labelHasilSinkron, validasiPutusanBatal, validasiRefundBaru, validasiSelesaikan, validasiTinjau,
} from '../lib/admin/pengecualian/rules.ts';
import {
  buatRefund, putuskanPembatalan, selesaikanRefundManual, sinkronkan, tinjauPembayaran,
  type KlaimRefund, type PengecualianDeps, type PengecualianStore,
} from '../lib/admin/pengecualian/service.ts';
import type { GatewayStore, HasilNotifikasi } from '../lib/gateway/service.ts';
import type { GatewayProvider, NotifikasiGateway } from '../lib/gateway/types.ts';
import type { StatusPesanan } from '../lib/slots.ts';
import { DEMO } from '../lib/demo.ts';

// ---------------------------------------------------------------------------
// Aturan murni
// ---------------------------------------------------------------------------

test('validasiTinjau: aksi tak dikenal, refund tanpa catatan, dan catatan terlalu panjang ditolak', () => {
  assert.match(validasiTinjau('hapus', '') ?? '', /terima|refund/);
  assert.match(validasiTinjau('refund', 'utu') ?? '', /minimal/);
  assert.equal(validasiTinjau('refund', 'Nominal tidak sesuai tagihan.'), null);
  assert.equal(validasiTinjau('terima', ''), null); // terima: catatan opsional
  assert.match(validasiTinjau('terima', 'x'.repeat(501)) ?? '', /maksimal/);
});

test('bolehTerima: hanya bayar telat dan status pesanan berubah yang boleh diterima', () => {
  assert.equal(bolehTerima('BAYAR_TERLAMBAT'), true);
  assert.equal(bolehTerima('STATUS_PESANAN_BERUBAH'), true);
  assert.equal(bolehTerima('NOMINAL_TIDAK_COCOK'), false);
  assert.equal(bolehTerima('PERLU_TINJAU_PROVIDER'), false);
  assert.equal(bolehTerima(null), false);
});

test('validasiPutusanBatal: tolak wajib catatan; nominal refund hanya bilangan wajar', () => {
  assert.match(validasiPutusanBatal('setuju', '') ?? '', /setujui|tolak/);
  assert.match(validasiPutusanBatal('tolak', 'ya') ?? '', /minimal/);
  assert.equal(validasiPutusanBatal('tolak', 'Jadwal kurang dari 2 jam, sesuai kebijakan tidak dapat dibatalkan.'), null);
  assert.equal(validasiPutusanBatal('setujui', '', null), null);
  assert.match(validasiPutusanBatal('setujui', '', -1) ?? '', /nonnegatif/);
  assert.match(validasiPutusanBatal('setujui', '', 10.5) ?? '', /bilangan bulat/);
  assert.match(validasiPutusanBatal('setujui', '', 200_000_000) ?? '', /tidak wajar/);
});

test('validasiRefundBaru: cara, nominal, dan alasan wajib sah', () => {
  assert.match(validasiRefundBaru('otomatis', 10_000, 'alasan cukup') ?? '', /gateway|manual/);
  assert.match(validasiRefundBaru('manual', 0, 'alasan cukup') ?? '', /positif/);
  assert.match(validasiRefundBaru('manual', 10_000.5, 'alasan cukup') ?? '', /bilangan bulat/);
  assert.match(validasiRefundBaru('manual', 10_000, 'utu') ?? '', /minimal/);
  assert.equal(validasiRefundBaru('manual', 50_000, 'Slot dipakai penyewa lain.'), null);
});

test('validasiSelesaikan: catatan transfer minimal 3 karakter', () => {
  assert.match(validasiSelesaikan('ab') ?? '', /minimal/);
  assert.equal(validasiSelesaikan('Transfer BCA 19/11'), null);
  assert.match(validasiSelesaikan('x'.repeat(501)) ?? '', /maksimal/);
});

test('labelHasilSinkron: kode dikenal punya teks khusus, tak dikenal memakai teks umum', () => {
  assert.notEqual(labelHasilSinkron('ok'), labelHasilSinkron('kedaluwarsa'));
  assert.match(labelHasilSinkron('review_telat'), /terlambat/);
  assert.equal(labelHasilSinkron('kode_aneh'), 'Status diperbarui.');
});

// ---------------------------------------------------------------------------
// Service dengan store memori + gateway palsu
// ---------------------------------------------------------------------------

const NOW = new Date('2026-11-19T10:00:00Z');

function buatStore() {
  const s = {
    pesananId: 1,
    kode: 'FGO-UJI01',
    status: 'menunggu_pembayaran' as StatusPesanan,
    totalHarga: 200_000,
    pembayaran: {
      id: 11,
      orderId: 'FGO-UJI01-R1',
      providerRef: 'inv-11',
      jumlah: 200_000,
      status: 'perlu_tinjau' as string,
      perluTinjau: true,
      alasan: 'BAYAR_TERLAMBAT' as string | null,
    },
    adaTransaksi: true,
    slotBentrok: false,
    adaPengajuan: false,
    keadaanPengajuan: 'menunggu' as 'menunggu' | 'disetujui' | 'ditolak',
    riwayat: [] as { statusBaru: StatusPesanan; catatan: string }[],
    refund: [] as {
      id: number; nominal: number; alasan: string; cara: 'gateway' | 'manual';
      status: 'menunggu' | 'diproses' | 'berhasil' | 'gagal';
      pembayaranGatewayId: number | null; reference: string | null; catatan: string | null;
    }[],
  };
  let refundBerikut = 1;

  const store: PengecualianStore = {
    async pesananDenganSlot(kode) {
      return s.kode === kode ? { id: s.pesananId, kode: s.kode, status: s.status, totalHarga: s.totalHarga } : null;
    },
    async pembayaranTinjau(pesananId) {
      if (pesananId !== s.pesananId || !s.pembayaran.perluTinjau) return null;
      return { id: s.pembayaran.id, orderId: s.pembayaran.orderId, provider: 'uji', status: s.pembayaran.status, jumlah: s.pembayaran.jumlah, alasan: s.pembayaran.alasan };
    },
    async transaksiTerakhir(kode) {
      return s.kode === kode && s.adaTransaksi
        ? { orderId: s.pembayaran.orderId, providerRef: s.pembayaran.providerRef }
        : null;
    },
    async pembayaranTertagih(kode) {
      if (s.kode !== kode || s.adaTransaksi === false) return null;
      return {
        id: s.pembayaran.id, orderId: s.pembayaran.orderId, providerRef: s.pembayaran.providerRef,
        jumlah: s.pembayaran.jumlah,
      };
    },
    async terimaPembayaran(d) {
      if (s.status !== 'menunggu_pembayaran') return 'STATUS_BERUBAH';
      if (s.slotBentrok) return 'SLOT_TERPAKAI';
      s.status = 'terkonfirmasi';
      s.pembayaran.status = 'dibayar';
      s.pembayaran.perluTinjau = false;
      s.riwayat.push({ statusBaru: 'terkonfirmasi', catatan: d.catatan });
      return 'ok';
    },
    async klaimRefundPembayaran(d) {
      if (!s.pembayaran.perluTinjau) return 'TIDAK_DITEMUKAN';
      if (s.refund.some((r) => r.pembayaranGatewayId === s.pembayaran.id && r.status !== 'gagal')) return 'SUDAH_ADA_REFUND';
      const refund = {
        id: refundBerikut++, nominal: d.nominal, alasan: d.alasan, cara: 'gateway' as const,
        status: 'menunggu' as const, pembayaranGatewayId: s.pembayaran.id, reference: null, catatan: d.catatan,
      };
      s.refund.push(refund);
      // Cermin prisma-store: klaim refund mengeluarkan pembayaran dari antrean pengecualian.
      s.pembayaran.perluTinjau = false;
      s.pembayaran.status = 'dibayar';
      if (s.status === 'menunggu_pembayaran') {
        s.status = 'dibatalkan';
        s.riwayat.push({ statusBaru: 'dibatalkan', catatan: 'Pembayaran bermasalah di-refund.' });
      }
      return { refundId: refund.id, orderId: s.pembayaran.orderId, providerRef: s.pembayaran.providerRef, jumlah: s.pembayaran.jumlah, adaTagihan: true } satisfies KlaimRefund;
    },
    async buatRefundBaru(d) {
      const refund = {
        id: refundBerikut++, nominal: d.nominal, alasan: d.alasan, cara: d.cara,
        status: 'menunggu' as const, pembayaranGatewayId: s.adaTransaksi ? s.pembayaran.id : null,
        reference: null, catatan: d.catatan,
      };
      s.refund.push(refund);
      return {
        refundId: refund.id, orderId: s.adaTransaksi ? s.pembayaran.orderId : null,
        providerRef: s.adaTransaksi ? s.pembayaran.providerRef : null,
        jumlah: s.pembayaran.jumlah, adaTagihan: s.adaTransaksi,
      } satisfies KlaimRefund;
    },
    async putuskanBatalSetujui(d) {
      if (!s.adaPengajuan) return 'TIDAK_DITEMUKAN';
      if (s.keadaanPengajuan !== 'menunggu' || s.status !== 'pengajuan_pembatalan') return 'STATUS_BERUBAH';
      s.status = 'dibatalkan';
      s.keadaanPengajuan = 'disetujui';
      s.riwayat.push({ statusBaru: 'dibatalkan', catatan: d.catatan });
      const nominal = d.nominalRefund ?? s.totalHarga;
      const refund = {
        id: refundBerikut++, nominal, alasan: 'Jadwal bentrok.', cara: 'gateway' as const,
        status: 'menunggu' as const, pembayaranGatewayId: s.pembayaran.id, reference: null, catatan: d.catatan,
      };
      s.refund.push(refund);
      return { refundId: refund.id, orderId: s.pembayaran.orderId, providerRef: s.pembayaran.providerRef, jumlah: s.pembayaran.jumlah, adaTagihan: true } satisfies KlaimRefund;
    },
    async putuskanBatalTolak(d) {
      if (!s.adaPengajuan) return 'TIDAK_DITEMUKAN';
      if (s.keadaanPengajuan !== 'menunggu' || s.status !== 'pengajuan_pembatalan') return 'STATUS_BERUBAH';
      s.status = 'terkonfirmasi';
      s.keadaanPengajuan = 'ditolak';
      s.riwayat.push({ statusBaru: 'terkonfirmasi', catatan: d.catatan });
      return 'ok';
    },
    async selesaikanRefund(d) {
      const r = s.refund.find((x) => x.id === d.refundId && (x.status === 'menunggu' || x.status === 'gagal'));
      if (!r) return 'TIDAK_DITEMUKAN';
      r.status = 'berhasil';
      r.cara = 'manual';
      r.catatan = d.catatan;
      return 'ok';
    },
    async perbaruiRefundGateway(d) {
      const r = s.refund.find((x) => x.id === d.refundId);
      if (!r) return;
      if (d.berhasil) {
        r.status = 'diproses';
        r.cara = 'gateway';
        r.reference = d.reference;
        if (r.pembayaranGatewayId === s.pembayaran.id) s.pembayaran.status = 'refund';
      } else {
        r.status = 'gagal';
        r.cara = 'manual';
        r.catatan = d.catatan;
      }
    },
  };
  return { store, keadaan: s };
}

function buatGateway(pilihan: { statusAmbil?: NotifikasiGateway | null; refundGagal?: boolean; lempar?: boolean } = {}) {
  const refundCalls: { orderId: string; nominal: number; alasan: string; providerRef?: string | null }[] = [];
  const statusCalls: { orderId: string; providerRef?: string | null }[] = [];
  const gateway: GatewayProvider = {
    nama: 'uji',
    async buatTransaksi() { throw new Error('tidak dipakai'); },
    async bacaNotifikasi() { return null; },
    async ambilStatus(orderId, providerRef) {
      statusCalls.push({ orderId, providerRef });
      if (pilihan.lempar) throw new Error('gateway down');
      return pilihan.statusAmbil ?? null;
    },
    async refund(orderId, nominal, alasan, providerRef) {
      refundCalls.push({ orderId, nominal, alasan, providerRef });
      if (pilihan.refundGagal) return { ok: false, kode: 'SALDO_KURANG' };
      return { ok: true, reference: `ref-${orderId}` };
    },
  };
  return { gateway, refundCalls, statusCalls };
}

function buatGatewayStore(hasil: HasilNotifikasi = 'ok') {
  const diproses: { orderId: string; status: string }[] = [];
  const gatewayStore: GatewayStore = {
    async cariPesananMilik() { throw new Error('tidak dipakai'); },
    async transaksiAktif() { throw new Error('tidak dipakai'); },
    async hitungPercobaan() { throw new Error('tidak dipakai'); },
    async simpanTransaksi() { throw new Error('tidak dipakai'); },
    async statusPesanan() { throw new Error('tidak dipakai'); },
    async prosesNotifikasi(n) {
      diproses.push({ orderId: n.orderId, status: n.status });
      return hasil;
    },
  };
  return { gatewayStore, diproses };
}

const ADMIN_ID = 9;

function buatDeps() {
  const { store, keadaan } = buatStore();
  const { gateway } = buatGateway();
  const { gatewayStore } = buatGatewayStore();
  const deps: PengecualianDeps = { store, gatewayStore, gateway, sekarang: () => NOW };
  return { deps, keadaan, store };
}

test('tinjauPembayaran: terima bayar telat → pesanan terkonfirmasi, slot terkunci, pembayaran aman', async () => {
  const { deps, keadaan } = buatDeps();
  const h = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'terima', catatan: 'Terlambat 1 jam, slot masih bebas.', adminId: ADMIN_ID });
  assert.equal(h.ok, true);
  assert.equal(keadaan.status, 'terkonfirmasi');
  assert.equal(keadaan.pembayaran.status, 'dibayar');
  assert.equal(keadaan.pembayaran.perluTinjau, false);
  assert.match(keadaan.riwayat.at(-1)?.catatan ?? '', /Terlambat 1 jam/);
});

test('tinjauPembayaran: nominal tidak cocok ditolak untuk aksi terima (wajib refund)', async () => {
  const { deps, keadaan } = buatDeps();
  keadaan.pembayaran.alasan = 'NOMINAL_TIDAK_COCOK';
  const h = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'terima', catatan: '', adminId: ADMIN_ID });
  assert.equal(h.ok, false);
  assert.ok(!h.ok && h.kode === 'VALIDASI');
  assert.ok(!h.ok && /refund/i.test(h.pesan));
  assert.equal(keadaan.status, 'menunggu_pembayaran');
});

test('tinjauPembayaran: slot sudah dipakai orang lain → SLOT_TERPAKAI, lalu refund penuh berhasil', async () => {
  const { deps, keadaan } = buatDeps();
  const { gateway, refundCalls } = buatGateway();
  deps.gateway = gateway;
  keadaan.slotBentrok = true;

  const gagal = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'terima', catatan: '', adminId: ADMIN_ID });
  assert.equal(gagal.ok, false);
  assert.ok(!gagal.ok && gagal.kode === 'SLOT_TERPAKAI');
  assert.equal(keadaan.status, 'menunggu_pembayaran');

  const refund = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Slot sudah dipesan penyewa lain.', adminId: ADMIN_ID });
  assert.equal(refund.ok, true);
  assert.equal(refundCalls.length, 1);
  assert.equal(refundCalls[0].orderId, 'FGO-UJI01-R1');
  assert.equal(refundCalls[0].providerRef, 'inv-11');
  assert.equal(keadaan.refund[0].status, 'diproses');
  assert.equal(keadaan.refund[0].reference, 'ref-FGO-UJI01-R1');
  assert.equal(keadaan.pembayaran.status, 'refund');
  assert.equal(keadaan.status, 'dibatalkan'); // masih menunggu bayar → ikut dibatalkan
});

test('tinjauPembayaran: refund gateway gagal → refund jatuh ke jalur manual (502)', async () => {
  const { deps, keadaan } = buatDeps();
  const { gateway, refundCalls } = buatGateway({ refundGagal: true });
  deps.gateway = gateway;

  const h = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Nominal tidak sesuai tagihan.', adminId: ADMIN_ID });
  assert.equal(h.ok, false);
  assert.ok(!h.ok && h.kode === 'GATEWAY_GAGAL');
  assert.equal(refundCalls.length, 1);
  assert.equal(keadaan.refund[0].status, 'gagal');
  assert.equal(keadaan.refund[0].cara, 'manual');
  assert.match(keadaan.refund[0].catatan ?? '', /SALDO_KURANG/);
});

test('tinjauPembayaran: satu refund aktif per transaksi — klaim kedua ditolak SUDAH_ADA_REFUND', async () => {
  const { deps, keadaan } = buatDeps();
  const pertama = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Nominal tidak sesuai tagihan.', adminId: ADMIN_ID });
  assert.equal(pertama.ok, true);
  // Pembayaran keluar antrean → tinjau ulang tidak menemukan apa pun.
  const kedua = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Coba refund sekali lagi.', adminId: ADMIN_ID });
  assert.equal(kedua.ok, false);
  assert.ok(!kedua.ok && kedua.kode === 'TIDAK_DITEMUKAN');
  // Simulasi balapan: UI usang masih melihat pembayaran perlu tinjau → guard ganda refund bekerja.
  keadaan.pembayaran.perluTinjau = true;
  const bentrok = await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Mencoba mengklaim dua kali.', adminId: ADMIN_ID });
  assert.ok(!bentrok.ok && bentrok.kode === 'SUDAH_ADA_REFUND');
  assert.equal(keadaan.refund.length, 1);
});

test('tinjauPembayaran: kode tidak dikenal dan pesanan tanpa pembayaran bermasalah → TIDAK_DITEMUKAN', async () => {
  const { deps } = buatDeps();
  const h1 = await tinjauPembayaran(deps, { kode: 'FGO-TAKADA', aksi: 'terima', catatan: '', adminId: ADMIN_ID });
  assert.ok(!h1.ok && h1.kode === 'TIDAK_DITEMUKAN');
  const { deps: deps2, keadaan } = buatDeps();
  keadaan.pembayaran.perluTinjau = false;
  const h2 = await tinjauPembayaran(deps2, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Uang dikembalikan penuh.', adminId: ADMIN_ID });
  assert.ok(!h2.ok && h2.kode === 'TIDAK_DITEMUKAN');
});

test('sinkronkan: tanpa transaksi → TIDAK_DITEMUKAN; gateway diam → BELUM_ADA_INFO; notif diproses lewat jalur webhook', async () => {
  const { deps, keadaan } = buatDeps();
  keadaan.adaTransaksi = false;
  const h0 = await sinkronkan(deps, 'FGO-UJI01');
  assert.ok(!h0.ok && h0.kode === 'TIDAK_DITEMUKAN');
  keadaan.adaTransaksi = true;

  const { gateway, statusCalls } = buatGateway({ statusAmbil: null });
  deps.gateway = gateway;
  const h1 = await sinkronkan(deps, 'FGO-UJI01');
  assert.ok(!h1.ok && h1.kode === 'BELUM_ADA_INFO');
  assert.deepEqual(statusCalls, [{ orderId: 'FGO-UJI01-R1', providerRef: 'inv-11' }]);

  const notif: NotifikasiGateway = {
    eventKey: 'uji:1', orderId: 'FGO-UJI01-R1', tipe: 'pembayaran', status: 'dibayar',
    metode: 'qris', jumlah: 200_000, waktuBayar: NOW, payload: {},
  };
  const { gateway: g2 } = buatGateway({ statusAmbil: notif });
  const { gatewayStore, diproses } = buatGatewayStore('ok');
  deps.gateway = g2;
  deps.gatewayStore = gatewayStore;
  const h2 = await sinkronkan(deps, 'FGO-UJI01');
  assert.equal(h2.ok, true);
  assert.ok(h2.ok && h2.data === 'ok');
  assert.equal(diproses.length, 1);
  assert.equal(diproses[0].orderId, 'FGO-UJI01-R1');

  const { gateway: g3 } = buatGateway({ lempar: true });
  deps.gateway = g3;
  const h3 = await sinkronkan(deps, 'FGO-UJI01');
  assert.ok(!h3.ok && h3.kode === 'GATEWAY_TIDAK_TERJANGKAU');
});

test('putuskanPembatalan: tolak wajib catatan; sukses mengembalikan pesanan ke Terkonfirmasi', async () => {
  const { deps, keadaan } = buatDeps();
  keadaan.adaPengajuan = true;
  keadaan.status = 'pengajuan_pembatalan';

  const gagal = await putuskanPembatalan(deps, { kode: 'FGO-UJI01', aksi: 'tolak', catatan: 'ya', nominalRefund: null, adminId: ADMIN_ID });
  assert.ok(!gagal.ok && gagal.kode === 'VALIDASI');

  const h = await putuskanPembatalan(deps, { kode: 'FGO-UJI01', aksi: 'tolak', catatan: 'Jadwal kurang dari 2 jam, kebijakan tidak izinkan.', nominalRefund: null, adminId: ADMIN_ID });
  assert.equal(h.ok, true);
  assert.equal(keadaan.status, 'terkonfirmasi');
  assert.equal(keadaan.keadaanPengajuan, 'ditolak');

  const lagi = await putuskanPembatalan(deps, { kode: 'FGO-UJI01', aksi: 'tolak', catatan: 'Mencoba memutus sekali lagi.', nominalRefund: null, adminId: ADMIN_ID });
  assert.ok(!lagi.ok && lagi.kode === 'STATUS_BERUBAH');
});

test('putuskanPembatalan: setujui → pesanan dibatalkan + refund gateway dibuat dan diproses', async () => {
  const { deps, keadaan } = buatDeps();
  const { gateway, refundCalls } = buatGateway();
  deps.gateway = gateway;
  keadaan.adaPengajuan = true;
  keadaan.status = 'pengajuan_pembatalan';

  const h = await putuskanPembatalan(deps, { kode: 'FGO-UJI01', aksi: 'setujui', catatan: 'Disetujui penuh; refund dikirim hari ini.', nominalRefund: null, adminId: ADMIN_ID });
  assert.equal(h.ok, true);
  assert.ok(h.ok && typeof h.data?.refundId === 'number');
  assert.equal(keadaan.status, 'dibatalkan');
  assert.equal(keadaan.keadaanPengajuan, 'disetujui');
  assert.equal(refundCalls.length, 1);
  assert.equal(keadaan.refund[0].status, 'diproses');
  assert.equal(keadaan.refund[0].nominal, 200_000); // nominalRefund null → total pesanan
});

test('buatRefund: manual tidak menyentuh gateway; gateway tanpa tagihan ditolak VALIDASI', async () => {
  const { deps, keadaan } = buatDeps();
  const { gateway, refundCalls } = buatGateway();
  deps.gateway = gateway;

  const manual = await buatRefund(deps, { kode: 'FGO-UJI01', nominal: 50_000, alasan: 'Kompensasi jam hilang.', cara: 'manual', catatan: null, adminId: ADMIN_ID });
  assert.equal(manual.ok, true);
  assert.equal(refundCalls.length, 0);
  assert.equal(keadaan.refund[0].status, 'menunggu');
  assert.equal(keadaan.refund[0].cara, 'manual');

  keadaan.adaTransaksi = false;
  const viaGateway = await buatRefund(deps, { kode: 'FGO-UJI01', nominal: 50_000, alasan: 'Kompensasi jam hilang.', cara: 'gateway', catatan: null, adminId: ADMIN_ID });
  assert.ok(!viaGateway.ok && viaGateway.kode === 'VALIDASI');
});

test('selesaikanRefundManual: refund menunggu/gagal bisa ditandai selesai; id salah → TIDAK_DITEMUKAN', async () => {
  const { deps, keadaan } = buatDeps();
  const { gateway } = buatGateway({ refundGagal: true });
  deps.gateway = gateway;
  await tinjauPembayaran(deps, { kode: 'FGO-UJI01', aksi: 'refund', catatan: 'Nominal tidak sesuai tagihan.', adminId: ADMIN_ID });
  assert.equal(keadaan.refund[0].status, 'gagal');

  const salah = await selesaikanRefundManual(deps, { kode: 'FGO-UJI01', refundId: 999, catatan: 'Transfer BCA 19/11', adminId: ADMIN_ID });
  assert.ok(!salah.ok && salah.kode === 'TIDAK_DITEMUKAN');

  const h = await selesaikanRefundManual(deps, { kode: 'FGO-UJI01', refundId: keadaan.refund[0].id, catatan: 'Transfer BCA 19/11', adminId: ADMIN_ID });
  assert.equal(h.ok, true);
  assert.equal(keadaan.refund[0].status, 'berhasil');
  assert.equal(keadaan.refund[0].cara, 'manual');
});

test('env uji: DATABASE_URL terisi sehingga jalur service (bukan MODE_DEMO) yang teruji', () => {
  assert.equal(DEMO, false);
});
