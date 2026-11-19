import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  nominalCocok, petakanStatusMidtrans, putusanNotifikasi, signatureCocok, signatureMidtrans,
} from '../lib/gateway/rules.ts';
import {
  buatTransaksi, prosesNotifikasi,
  type GatewayDeps, type GatewayStore, type PesananGateway, type TransaksiTersimpan,
} from '../lib/gateway/service.ts';
import type { BuatTransaksiInput, GatewayProvider, NotifikasiGateway, TransaksiGateway } from '../lib/gateway/types.ts';

// 18 Nov 2026, 09.00 WIB.
const NOW = new Date('2026-11-18T02:00:00Z');
const JAM = 3_600_000;

const PESANAN: PesananGateway = {
  id: 1,
  kode: 'FGO-UJI01',
  penggunaId: 7,
  status: 'menunggu_pembayaran',
  totalHarga: 200_000,
  batasBayarPada: new Date(NOW.getTime() + JAM),
  lapanganNama: 'Lapangan A',
  namaPenyewa: 'Rani Putri',
  email: 'rani@email.com',
  slot: [{ jam: 20, hargaPerJam: 100_000 }, { jam: 21, hargaPerJam: 100_000 }],
};

function buatStore(pesanan: PesananGateway | null = PESANAN, awal: TransaksiTersimpan[] = []) {
  const transaksi = [...awal];
  const notifikasi: (NotifikasiGateway & { provider: string; now: Date })[] = [];

  const store: GatewayStore = {
    async cariPesananMilik(kode, penggunaId) {
      return pesanan && pesanan.kode === kode && pesanan.penggunaId === penggunaId ? pesanan : null;
    },
    async transaksiAktif(pesananId, now) {
      const t = transaksi.find((x) => x.status === 'pending' && (x.kedaluwarsaPada?.getTime() ?? 0) > now.getTime());
      return t ?? null;
    },
    async hitungPercobaan() {
      return transaksi.length;
    },
    async simpanTransaksi(d) {
      const t: TransaksiTersimpan = { ...d, status: 'pending' };
      transaksi.push(t);
      return t;
    },
    async statusPesanan() {
      return null;
    },
    async prosesNotifikasi(d) {
      notifikasi.push(d);
      return 'ok';
    },
  };

  return { store, transaksi, notifikasi };
}

function buatProvider(nama = 'fake') {
  const dipanggil: BuatTransaksiInput[] = [];

  const gateway: GatewayProvider = {
    nama,
    async buatTransaksi(i): Promise<TransaksiGateway> {
      dipanggil.push(i);
      return {
        orderId: i.orderId,
        token: `tok-${i.orderId}`,
        redirectUrl: `https://pay.test/${i.orderId}`,
        kedaluwarsaPada: i.kedaluwarsaPada,
      };
    },
    async bacaNotifikasi() { return null; },
    async ambilStatus() { return null; },
    async refund() { return { ok: true, reference: 'ref-1' }; },
  };

  return { gateway, dipanggil };
}

function deps(store: GatewayStore, gateway: GatewayProvider): GatewayDeps {
  return { store, gateway, sekarang: () => NOW, baseUrl: 'http://app.test' };
}

// ─── Aturan murni ───────────────────────────────────────────────────────────

test('signatureMidtrans = SHA-512(order_id + status_code + gross_amount + server_key)', () => {
  const i = { orderId: 'FGO-UJI01', statusCode: '200', grossAmount: '200000.00', serverKey: 'server-key-rahasia' };
  const diharapkan = createHash('sha512')
    .update(`${i.orderId}${i.statusCode}${i.grossAmount}${i.serverKey}`)
    .digest('hex');
  assert.equal(signatureMidtrans(i), diharapkan);
  assert.ok(signatureCocok(diharapkan, diharapkan.toUpperCase())); // perbandingan tidak peka huruf
  assert.equal(signatureCocok(diharapkan, diharapkan.replace(/.$/, '0')), false);
  assert.equal(signatureCocok('pendek', diharapkan), false); // panjang beda tidak melempar
});

test('petakanStatusMidtrans menutup semua status yang dipakai provider', () => {
  assert.equal(petakanStatusMidtrans('capture', 'accept'), 'dibayar');
  assert.equal(petakanStatusMidtrans('capture'), 'dibayar');
  assert.equal(petakanStatusMidtrans('capture', 'challenge'), 'perlu_tinjau');
  assert.equal(petakanStatusMidtrans('settlement'), 'dibayar');
  assert.equal(petakanStatusMidtrans('pending'), 'pending');
  for (const s of ['deny', 'cancel', 'failure']) assert.equal(petakanStatusMidtrans(s), 'gagal');
  assert.equal(petakanStatusMidtrans('expire'), 'kedaluwarsa');
  assert.equal(petakanStatusMidtrans('refund'), 'refund');
  assert.equal(petakanStatusMidtrans('partial_refund'), 'sebagian_refund');
  assert.equal(petakanStatusMidtrans('chargeback'), 'perlu_tinjau');
  assert.equal(petakanStatusMidtrans('partial_chargeback'), 'perlu_tinjau');
  assert.equal(petakanStatusMidtrans('status-baru-tak-dikenal'), 'perlu_tinjau');
});

test('putusanNotifikasi: konfirmasi hanya bila nominal cocok, belum telat, dan status masih menunggu', () => {
  const dasar = {
    status: 'dibayar' as const,
    statusPembayaran: 'pending' as const,
    statusPesanan: 'menunggu_pembayaran' as const,
    jumlahNotif: 200_000 as number | null,
    jumlahDb: 200_000,
    waktuBayar: NOW as Date | null,
    batasBayar: PESANAN.batasBayarPada,
    now: NOW,
  };

  assert.equal(putusanNotifikasi(dasar), 'konfirmasi');
  assert.equal(putusanNotifikasi({ ...dasar, jumlahNotif: 199_999 }), 'review_nominal');
  assert.equal(putusanNotifikasi({ ...dasar, jumlahNotif: null }), 'konfirmasi'); // provider tak mengirim nominal
  assert.equal(putusanNotifikasi({ ...dasar, waktuBayar: new Date(PESANAN.batasBayarPada.getTime() + 1) }), 'review_telat');
  assert.equal(putusanNotifikasi({ ...dasar, statusPesanan: 'dibatalkan' }), 'review_status');
  assert.equal(putusanNotifikasi({ ...dasar, statusPembayaran: 'dibayar' }), 'abaikan'); // tidak mundur
  assert.equal(putusanNotifikasi({ ...dasar, statusPembayaran: 'perlu_tinjau' }), 'abaikan'); // menunggu admin
  assert.equal(putusanNotifikasi({ ...dasar, statusPembayaran: 'perlu_tinjau', status: 'kedaluwarsa' }), 'abaikan');
  assert.equal(putusanNotifikasi({ ...dasar, statusPembayaran: 'perlu_tinjau', status: 'refund' }), 'refund');
  assert.equal(putusanNotifikasi({ ...dasar, status: 'pending' }), 'pending');
  assert.equal(putusanNotifikasi({ ...dasar, statusPembayaran: 'dibayar', status: 'pending' }), 'abaikan');
  assert.equal(putusanNotifikasi({ ...dasar, status: 'kedaluwarsa' }), 'kedaluwarsa');
  assert.equal(putusanNotifikasi({ ...dasar, status: 'kedaluwarsa', statusPembayaran: 'dibayar' }), 'abaikan');
  assert.equal(putusanNotifikasi({ ...dasar, status: 'gagal' }), 'gagal');
  assert.equal(putusanNotifikasi({ ...dasar, status: 'perlu_tinjau' }), 'perlu_tinjau');
  assert.equal(putusanNotifikasi({ ...dasar, status: 'refund' }), 'refund');
});

test('nominalCocok: nominal kosong dianggap netral, nominal beda ditolak', () => {
  assert.equal(nominalCocok(null, 200_000), true);
  assert.equal(nominalCocok(200_000, 200_000), true);
  assert.equal(nominalCocok(200_001, 200_000), false);
});

// ─── buatTransaksi ──────────────────────────────────────────────────────────

test('buatTransaksi: nominal dan item dihitung dari data server, bukan klien', async () => {
  const s = buatStore();
  const g = buatProvider();
  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode });

  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.transaksi.orderId, 'FGO-UJI01');
  assert.equal(r.transaksi.redirectUrl, 'https://pay.test/FGO-UJI01');
  assert.equal(g.dipanggil.length, 1);

  const i = g.dipanggil[0];
  assert.equal(i.jumlah, PESANAN.totalHarga);
  assert.equal(i.namaPenyewa, 'Rani Putri');
  assert.equal(i.email, 'rani@email.com');
  assert.equal(i.itemDetails.length, 2);
  assert.equal(i.itemDetails.reduce((n, x) => n + x.harga * x.jumlah, 0), PESANAN.totalHarga);
  assert.equal(s.transaksi.length, 1);
});

test('buatTransaksi: metode_aktif diteruskan sebagai daftar metode ke provider', async () => {
  const s = buatStore();
  const g = buatProvider();
  const d: GatewayDeps = { ...deps(s.store, g.gateway), metodeAktif: async () => ['qris', 'gopay'] };

  const r = await buatTransaksi(d, { penggunaId: 7, kode: PESANAN.kode });
  assert.ok(r.ok);
  assert.deepEqual(g.dipanggil[0].metodeAktif, ['qris', 'gopay']);
});

test('buatTransaksi: pesanan milik orang lain, status berubah, atau batas lewat ditolak', async () => {
  const s = buatStore();
  const g = buatProvider();
  const d = deps(s.store, g.gateway);

  assert.deepEqual(await buatTransaksi(d, { penggunaId: 8, kode: PESANAN.kode }), { ok: false, kode: 'TIDAK_DITEMUKAN' });
  assert.deepEqual(await buatTransaksi(d, { penggunaId: 7, kode: 'FGO-LAIN' }), { ok: false, kode: 'TIDAK_DITEMUKAN' });
  assert.deepEqual(
    await buatTransaksi(deps(buatStore({ ...PESANAN, status: 'terkonfirmasi' }).store, g.gateway), { penggunaId: 7, kode: PESANAN.kode }),
    { ok: false, kode: 'STATUS_BERUBAH' },
  );
  assert.deepEqual(
    await buatTransaksi(deps(buatStore({ ...PESANAN, batasBayarPada: NOW }).store, g.gateway), { penggunaId: 7, kode: PESANAN.kode }),
    { ok: false, kode: 'KEDALUWARSA' },
  );
  assert.equal(g.dipanggil.length, 0);
});

test('buatTransaksi: transaksi pending yang masih berlaku dipakai ulang (klik ganda tidak menagih dua kali)', async () => {
  const aktif: TransaksiTersimpan = {
    orderId: 'FGO-UJI01',
    token: 'tok-lama',
    redirectUrl: 'https://pay.test/lama',
    status: 'pending',
    kedaluwarsaPada: new Date(NOW.getTime() + 600_000),
  };
  const s = buatStore(PESANAN, [aktif]);
  const g = buatProvider();

  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.transaksi.orderId, 'FGO-UJI01');
  assert.equal(r.transaksi.redirectUrl, 'https://pay.test/lama');
  assert.equal(g.dipanggil.length, 0);
  assert.equal(s.transaksi.length, 1);
});

test('buatTransaksi: transaksi lama kedaluwarsa membuat order baru -R2, dan batas 5 percobaan dihormati', async () => {
  const lama: TransaksiTersimpan = {
    orderId: 'FGO-UJI01',
    token: null,
    redirectUrl: 'https://pay.test/lama',
    status: 'pending',
    kedaluwarsaPada: new Date(NOW.getTime() - 1000),
  };
  const s = buatStore(PESANAN, [lama]);
  const g = buatProvider();

  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.transaksi.orderId, 'FGO-UJI01-R2');
  assert.equal(s.transaksi.length, 2);

  const penuh = buatStore(PESANAN, Array.from({ length: 5 }, (_, n) => ({ ...lama, orderId: `FGO-UJI01-R${n + 1}` })));
  assert.deepEqual(
    await buatTransaksi(deps(penuh.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode }),
    { ok: false, kode: 'BATAS_PERCOBAAN' },
  );
  assert.equal(penuh.transaksi.length, 5);
});

test('buatTransaksi: kegagalan provider tidak menyimpan transaksi setengah jadi', async () => {
  const s = buatStore();
  const gagal: GatewayProvider = {
    nama: 'fake',
    async buatTransaksi() { throw new Error('jaringan putus'); },
    async bacaNotifikasi() { return null; },
    async ambilStatus() { return null; },
    async refund() { return { ok: false, kode: 'GAGAL' }; },
  };

  assert.deepEqual(
    await buatTransaksi(deps(s.store, gagal), { penggunaId: 7, kode: PESANAN.kode }),
    { ok: false, kode: 'GATEWAY_GAGAL' },
  );
  assert.equal(s.transaksi.length, 0);
});

// ─── prosesNotifikasi ───────────────────────────────────────────────────────

test('prosesNotifikasi meneruskan provider dan waktu server ke store', async () => {
  const s = buatStore();
  const g = buatProvider('midtrans');
  const notif: NotifikasiGateway = {
    eventKey: 'evt-1',
    orderId: 'FGO-UJI01',
    tipe: 'pembayaran',
    status: 'dibayar',
    metode: 'qris',
    jumlah: 200_000,
    waktuBayar: NOW,
    payload: { transaction_status: 'settlement' },
  };

  assert.equal(await prosesNotifikasi(deps(s.store, g.gateway), notif), 'ok');
  assert.equal(s.notifikasi.length, 1);
  assert.equal(s.notifikasi[0].provider, 'midtrans');
  assert.deepEqual(s.notifikasi[0].now, NOW);
  assert.equal(s.notifikasi[0].eventKey, 'evt-1');
});
