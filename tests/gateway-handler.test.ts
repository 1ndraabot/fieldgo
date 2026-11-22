import './helpers/env.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buatHandlersGateway } from '../lib/gateway/handlers.ts';
import { buatLimiter } from '../lib/auth/ratelimit.ts';
import type { AuthDeps, AuthStore, Pengguna } from '../lib/auth/service.ts';
import type { GatewayStore, StatusPesananGateway } from '../lib/gateway/service.ts';
import type { GatewayProvider, NotifikasiGateway } from '../lib/gateway/types.ts';

const NOW = new Date('2026-11-18T02:00:00Z');

const PENGGUNA: Pengguna = {
  id: 7, nama: 'Rani Putri', email: 'rani@email.com', kataSandi: '', nomorKontak: '081234567890',
  peran: 'penyewa', emailTerverifikasiPada: NOW, dinonaktifkanPada: null,
};

const MENUNGGU: StatusPesananGateway = {
  status: 'menunggu_pembayaran',
  batasBayarPada: new Date(NOW.getTime() + 3_600_000),
  transaksi: { orderId: 'FGO-UJI01', providerRef: 'inv-1', status: 'pending', dibayarPada: null },
};

const TERKONFIRMASI: StatusPesananGateway = {
  ...MENUNGGU,
  status: 'terkonfirmasi',
  transaksi: { ...MENUNGGU.transaksi!, status: 'dibayar', dibayarPada: NOW },
};

const NOTIF: NotifikasiGateway = {
  eventKey: 'xendit:invoice:inv-1:PAID',
  orderId: 'FGO-UJI01',
  providerRef: 'inv-1',
  tipe: 'pembayaran',
  status: 'dibayar',
  metode: 'QRIS',
  jumlah: 200_000,
  waktuBayar: NOW,
  payload: { status: 'PAID' },
};

function siapkan(o: { awal?: StatusPesananGateway | null; dibatasi?: boolean; notif?: NotifikasiGateway | null } = {}) {
  let n = 0;
  const store: GatewayStore = {
    async cariPesananMilik() { return null; },
    async transaksiAktif() { return null; },
    async hitungPercobaan() { return 0; },
    async simpanTransaksi() { throw new Error('tidak dipakai'); },
    async statusPesanan() {
      // Panggilan pertama = status awal; berikutnya = hasil setelah diproses.
      const v = n === 0 ? (o.awal === undefined ? MENUNGGU : o.awal) : TERKONFIRMASI;
      n += 1;
      return v;
    },
    async prosesNotifikasi() { return 'ok'; },
  };

  const gateway: GatewayProvider = {
    nama: 'fake',
    async buatTransaksi() { throw new Error('tidak dipakai'); },
    async bacaNotifikasi() { return null; },
    async ambilStatus() {
      if (o.notif === null) return null;
      return o.notif ?? NOTIF;
    },
    async refund() { return { ok: false, kode: 'GAGAL' }; },
  };

  const authStore = { async cariSesi() { return PENGGUNA; } } as unknown as AuthStore;
  const auth: AuthDeps = { store: authStore, mailer: { kirim: async () => {} }, sekarang: () => NOW, baseUrl: 'http://app.test' };

  return buatHandlersGateway({
    store, gateway, sekarang: () => NOW, baseUrl: 'http://app.test', auth,
    limiter: buatLimiter({ maks: 10, jendelaMs: 60_000, sekarang: () => NOW.getTime() }),
    gatewayAktif: async () => true,
    throttleSinkron: () => (o.dibatasi ? { diizinkan: false, ulangiDetik: 7 } : { diizinkan: true, ulangiDetik: 0 }),
  });
}

const post = (kode = 'FGO-UJI01', extra: Record<string, string> = {}) =>
  new Request(`http://app.test/api/pesanan/${kode}/sinkron`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...extra },
    body: '{}',
  });

test('sinkron: menolak tamu, media non-JSON, dan kode tidak valid', async () => {
  const h = siapkan();
  assert.equal((await h.sinkron(post('FGO-UJI01'), 'FGO-UJI01')).status, 401);

  const cookie = { cookie: 'sesi=token-uji' };
  assert.equal((await h.sinkron(new Request('http://app.test/x', { method: 'POST', headers: cookie }), 'FGO-UJI01')).status, 415);
  assert.equal((await h.sinkron(post('xx', cookie), 'xx')).status, 404);
});

test('sinkron: pesanan bukan milik sesi ini tidak ada', async () => {
  const h = siapkan({ awal: null });
  const r = await h.sinkron(post('FGO-UJI01', { cookie: 'sesi=token-uji' }), 'FGO-UJI01');
  assert.equal(r.status, 404);
  assert.deepEqual(await r.json(), { ok: false, kode: 'TIDAK_DITEMUKAN' });
});

test('sinkron: pembatas per pesanan dikembalikan sebagai 429 dengan sisa waktu', async () => {
  const h = siapkan({ dibatasi: true });
  const r = await h.sinkron(post('FGO-UJI01', { cookie: 'sesi=token-uji' }), 'FGO-UJI01');
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { ok: false, kode: 'DIBATASI', ulangiDetik: 7 });
});

test('sinkron: berhasil → status terbaru dan hasil notifikasi dikembalikan', async () => {
  const h = siapkan();
  const r = await h.sinkron(post('FGO-UJI01', { cookie: 'sesi=token-uji' }), 'FGO-UJI01');
  assert.equal(r.status, 200);
  const b = await r.json() as Record<string, unknown>;
  assert.equal(b.ok, true);
  assert.equal(b.status, 'terkonfirmasi');
  assert.equal(b.statusBayar, 'dibayar');
  assert.equal(b.hasil, 'ok');
  assert.equal(typeof b.dibayarPada, 'string');
});

test('sinkron: gateway belum punya info → 409', async () => {
  const h = siapkan({ notif: null });
  const r = await h.sinkron(post('FGO-UJI01', { cookie: 'sesi=token-uji' }), 'FGO-UJI01');
  assert.equal(r.status, 409);
  assert.deepEqual(await r.json(), { ok: false, kode: 'BELUM_ADA_INFO' });
});
