import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  durasiInvoiceDetik, instruksiDariTransaksi, kanalAktif, metodeDiizinkan, nominalCocok, peringatanEnvProduksi,
  petakanMetodeXendit, petakanStatusPaymentRequest, petakanStatusRefundXendit, petakanStatusXendit,
  putusanNotifikasi, samakanAmanWaktu,
} from '../lib/gateway/rules.ts';
import {
  buatTransaksi, prosesNotifikasi, sinkronkanMilik,
  type GatewayDeps, type GatewayStore, type PesananGateway, type StatusPesananGateway, type TransaksiTersimpan,
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
  const ditutup: string[] = [];

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
    async tutupTransaksiPending(orderId) {
      ditutup.push(orderId);
      const t = transaksi.find((x) => x.orderId === orderId && x.status === 'pending');
      if (t) t.status = 'gagal';
    },
    async statusPesanan() {
      return null;
    },
    async prosesNotifikasi(d) {
      notifikasi.push(d);
      return 'ok';
    },
  };

  return { store, transaksi, notifikasi, ditutup };
}

function buatProvider(nama = 'fake') {
  const dipanggil: BuatTransaksiInput[] = [];
  const dibatalkan: string[] = [];

  const gateway: GatewayProvider = {
    nama,
    async buatTransaksi(i): Promise<TransaksiGateway> {
      dipanggil.push(i);
      return {
        orderId: i.orderId,
        token: `tok-${i.orderId}`,
        redirectUrl: `https://pay.test/${i.orderId}`,
        kedaluwarsaPada: i.kedaluwarsaPada,
        providerRef: `inv-${i.orderId}`,
        metode: i.metode ?? null,
        instruksi: i.metode
          ? { jenis: 'redirect', url: `https://pay.test/${i.orderId}`, kedaluwarsaPada: i.kedaluwarsaPada }
          : null,
      };
    },
    async bacaNotifikasi() { return null; },
    async ambilStatus() { return null; },
    async refund() { return { ok: true, reference: 'ref-1' }; },
    async batalkan(providerRef) { dibatalkan.push(providerRef); },
  };

  return { gateway, dipanggil, dibatalkan };
}

function deps(store: GatewayStore, gateway: GatewayProvider): GatewayDeps {
  return { store, gateway, sekarang: () => NOW, baseUrl: 'http://app.test' };
}

// ─── Aturan murni ───────────────────────────────────────────────────────────

test('samakanAmanWaktu: token callback harus sama persis, termasuk panjangnya', () => {
  const token = 'token-callback-rahasia';
  assert.equal(samakanAmanWaktu(token, token), true);
  assert.equal(samakanAmanWaktu(token, token.toUpperCase()), false); // token peka huruf
  assert.equal(samakanAmanWaktu(token, token.replace(/.$/, '0')), false);
  assert.equal(samakanAmanWaktu('pendek', token), false); // panjang beda tidak melempar
});

test('petakanStatusXendit menutup status invoice yang dipakai provider', () => {
  assert.equal(petakanStatusXendit('PAID'), 'dibayar');
  assert.equal(petakanStatusXendit('SETTLED'), 'dibayar');
  assert.equal(petakanStatusXendit('paid'), 'dibayar');
  assert.equal(petakanStatusXendit('PENDING'), 'pending');
  assert.equal(petakanStatusXendit('EXPIRED'), 'kedaluwarsa');
  assert.equal(petakanStatusXendit('FAILED'), 'gagal');
  assert.equal(petakanStatusXendit('status-baru-tak-dikenal'), 'perlu_tinjau');
});

test('petakanStatusPaymentRequest menutup status Payment Requests v3', () => {
  assert.equal(petakanStatusPaymentRequest('SUCCEEDED'), 'dibayar');
  assert.equal(petakanStatusPaymentRequest('REQUIRES_ACTION'), 'pending');
  assert.equal(petakanStatusPaymentRequest('ACCEPTING_PAYMENTS'), 'pending');
  assert.equal(petakanStatusPaymentRequest('AUTHORIZED'), 'pending');
  assert.equal(petakanStatusPaymentRequest('EXPIRED'), 'kedaluwarsa');
  assert.equal(petakanStatusPaymentRequest('FAILED'), 'gagal');
  assert.equal(petakanStatusPaymentRequest('CANCELED'), 'gagal');
  assert.equal(petakanStatusPaymentRequest('CANCELLED'), 'gagal');
  assert.equal(petakanStatusPaymentRequest('status-baru-tak-dikenal'), 'perlu_tinjau');
});

test('kanalAktif: kosong = semua, kode admin v3 dipakai, kode lama diterjemahkan', () => {
  assert.equal(kanalAktif([]).length, 8);
  assert.deepEqual(kanalAktif(['qris']).map((k) => k.kode), ['QRIS']);
  assert.deepEqual(kanalAktif(['va_bca']).map((k) => k.kode), ['BCA_VIRTUAL_ACCOUNT']);
  assert.deepEqual(kanalAktif(['bank_transfer']).map((k) => k.kode), [
    'BCA_VIRTUAL_ACCOUNT', 'BNI_VIRTUAL_ACCOUNT', 'BRI_VIRTUAL_ACCOUNT', 'MANDIRI_VIRTUAL_ACCOUNT', 'PERMATA_VIRTUAL_ACCOUNT',
  ]);
  assert.equal(kanalAktif(['credit_card']).length, 0); // kartu di luar cakupan
});

test('metodeDiizinkan: channel_code diterima hanya bila kanal aktif', () => {
  assert.equal(metodeDiizinkan('QRIS', []), true);
  assert.equal(metodeDiizinkan('QRIS', ['va_bca']), false);
  assert.equal(metodeDiizinkan('DANA', ['dana', 'qris']), true);
  assert.equal(metodeDiizinkan('DANA', ['qris']), false);
  assert.equal(metodeDiizinkan('OVO', []), false); // tidak ada di katalog
});

test('instruksiDariTransaksi: QR dari token, VA dari token, e-wallet dari redirect_url', () => {
  const kedaluwarsa = new Date('2026-11-18T03:00:00.000Z');
  assert.deepEqual(
    instruksiDariTransaksi({ metode: 'QRIS', token: 'qr-abc', redirectUrl: null, kedaluwarsaPada: kedaluwarsa }),
    { jenis: 'qr', nilai: 'qr-abc', kedaluwarsaPada: kedaluwarsa },
  );
  assert.deepEqual(
    instruksiDariTransaksi({ metode: 'BCA_VIRTUAL_ACCOUNT', token: '381659999033910', redirectUrl: null, kedaluwarsaPada: kedaluwarsa }),
    { jenis: 'va', nomor: '381659999033910', bank: 'BCA', kedaluwarsaPada: kedaluwarsa },
  );
  assert.deepEqual(
    instruksiDariTransaksi({ metode: 'DANA', token: null, redirectUrl: 'https://dana.test/pay', kedaluwarsaPada: kedaluwarsa }),
    { jenis: 'redirect', url: 'https://dana.test/pay', kedaluwarsaPada: kedaluwarsa },
  );
  // Tanpa nilai instruksi (mis. respons tidak lengkap) → null, bukan instruksi kosong.
  assert.equal(instruksiDariTransaksi({ metode: 'QRIS', token: null, redirectUrl: null, kedaluwarsaPada: kedaluwarsa }), null);
  assert.equal(instruksiDariTransaksi({ metode: 'INV-123', token: null, redirectUrl: 'https://x', kedaluwarsaPada: kedaluwarsa }), null);
});

test('petakanStatusRefundXendit: sukses/pending = refund, sisanya diabaikan', () => {
  assert.equal(petakanStatusRefundXendit('succeeded'), 'refund');
  assert.equal(petakanStatusRefundXendit('PENDING'), 'refund');
  assert.equal(petakanStatusRefundXendit('failed'), 'abaikan');
  assert.equal(petakanStatusRefundXendit('status-aneh'), 'abaikan');
});

test('petakanMetodeXendit: kode admin dipetakan ke payment_methods Xendit tanpa duplikat', () => {
  assert.deepEqual(petakanMetodeXendit(['qris']), ['QRIS']);
  assert.deepEqual(petakanMetodeXendit(['echannel']), ['MANDIRI']);
  assert.deepEqual(
    petakanMetodeXendit(['bank_transfer']),
    ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA'],
  );
  assert.deepEqual(petakanMetodeXendit(['qris', 'echannel', 'gopay']), ['QRIS', 'MANDIRI', 'GOPAY']);
  assert.deepEqual(petakanMetodeXendit([]), []); // kosong = semua metode akun
  assert.deepEqual(petakanMetodeXendit(['tidak-dikenal']), []);
});

test('durasiInvoiceDetik: sisa waktu dibulatkan ke atas dan minimal 60 detik', () => {
  assert.equal(durasiInvoiceDetik(new Date(NOW.getTime() + 3_600_000), NOW), 3600);
  assert.equal(durasiInvoiceDetik(new Date(NOW.getTime() + 1_500), NOW), 60); // dibulatkan & minimum
  assert.equal(durasiInvoiceDetik(new Date(NOW.getTime() - 1_000), NOW), 60);
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
    providerRef: 'inv-lama',
    token: 'tok-lama',
    redirectUrl: 'https://pay.test/lama',
    status: 'pending',
    kedaluwarsaPada: new Date(NOW.getTime() + 600_000),
    metode: null,
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

test('buatTransaksi: transaksi lama kedaluwarsa membuat order baru -R2, dan batas 10 percobaan dihormati', async () => {
  const lama: TransaksiTersimpan = {
    orderId: 'FGO-UJI01',
    providerRef: null,
    token: null,
    redirectUrl: 'https://pay.test/lama',
    status: 'pending',
    kedaluwarsaPada: new Date(NOW.getTime() - 1000),
    metode: null,
  };
  const s = buatStore(PESANAN, [lama]);
  const g = buatProvider();

  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.transaksi.orderId, 'FGO-UJI01-R2');
  assert.equal(s.transaksi.length, 2);

  const penuh = buatStore(PESANAN, Array.from({ length: 10 }, (_, n) => ({ ...lama, orderId: `FGO-UJI01-R${n + 1}` })));
  assert.deepEqual(
    await buatTransaksi(deps(penuh.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode }),
    { ok: false, kode: 'BATAS_PERCOBAAN' },
  );
  assert.equal(penuh.transaksi.length, 10);
});

// ─── Pemilihan metode (Payment Requests v3) ─────────────────────────────────

test('buatTransaksi: metode tidak diizinkan Pengaturan ditolak tanpa memanggil gateway', async () => {
  const s = buatStore();
  const g = buatProvider();
  const d: GatewayDeps = { ...deps(s.store, g.gateway), metodeAktif: async () => ['qris'] };

  assert.deepEqual(
    await buatTransaksi(d, { penggunaId: 7, kode: PESANAN.kode, metode: 'DANA' }),
    { ok: false, kode: 'METODE_TIDAK_VALID' },
  );
  assert.deepEqual(
    await buatTransaksi(d, { penggunaId: 7, kode: PESANAN.kode, metode: 'OVO' }),
    { ok: false, kode: 'METODE_TIDAK_VALID' },
  );
  assert.equal(g.dipanggil.length, 0);
  assert.equal(s.transaksi.length, 0);
});

test('buatTransaksi: metode dipilih diteruskan ke provider dan tersimpan', async () => {
  const s = buatStore();
  const g = buatProvider();

  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode, metode: 'QRIS' });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(g.dipanggil[0].metode, 'QRIS');
  assert.equal(s.transaksi[0].metode, 'QRIS');
  assert.equal(r.transaksi.metode, 'QRIS');
  assert.ok(r.transaksi.instruksi);
});

test('buatTransaksi: metode sama pada transaksi berlaku dipakai ulang tanpa tagihan baru', async () => {
  const aktif: TransaksiTersimpan = {
    orderId: 'FGO-UJI01',
    providerRef: 'pr-lama',
    token: 'qr-lama',
    redirectUrl: null,
    status: 'pending',
    kedaluwarsaPada: new Date(NOW.getTime() + 600_000),
    metode: 'QRIS',
  };
  const s = buatStore(PESANAN, [aktif]);
  const g = buatProvider();

  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode, metode: 'QRIS' });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.transaksi.orderId, 'FGO-UJI01');
  assert.equal(r.transaksi.metode, 'QRIS');
  assert.deepEqual(r.transaksi.instruksi, {
    jenis: 'qr', nilai: 'qr-lama', kedaluwarsaPada: new Date(NOW.getTime() + 600_000),
  });
  assert.equal(g.dipanggil.length, 0);
  assert.equal(g.dibatalkan.length, 0);
  assert.equal(s.ditutup.length, 0);
});

test('buatTransaksi: ganti metode membatalkan transaksi lama lalu membuat tagihan baru', async () => {
  const lama: TransaksiTersimpan = {
    orderId: 'FGO-UJI01',
    providerRef: 'pr-lama',
    token: 'qr-lama',
    redirectUrl: null,
    status: 'pending',
    kedaluwarsaPada: new Date(NOW.getTime() + 600_000),
    metode: 'QRIS',
  };
  const s = buatStore(PESANAN, [lama]);
  const g = buatProvider();

  const r = await buatTransaksi(deps(s.store, g.gateway), { penggunaId: 7, kode: PESANAN.kode, metode: 'DANA' });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.deepEqual(g.dibatalkan, ['pr-lama']); // best effort di provider
  assert.deepEqual(s.ditutup, ['FGO-UJI01']); // ditutup di DB sebelum tagihan baru
  assert.equal(g.dipanggil.length, 1);
  assert.equal(g.dipanggil[0].metode, 'DANA');
  assert.equal(r.transaksi.orderId, 'FGO-UJI01-R2');
  assert.equal(r.transaksi.metode, 'DANA');
  assert.equal(s.transaksi.length, 2);
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
  const g = buatProvider('xendit');
  const notif: NotifikasiGateway = {
    eventKey: 'evt-1',
    orderId: 'FGO-UJI01',
    tipe: 'pembayaran',
    status: 'dibayar',
    metode: 'qris',
    jumlah: 200_000,
    waktuBayar: NOW,
    payload: { status: 'PAID' },
  };

  assert.equal(await prosesNotifikasi(deps(s.store, g.gateway), notif), 'ok');
  assert.equal(s.notifikasi.length, 1);
  assert.equal(s.notifikasi[0].provider, 'xendit');
  assert.deepEqual(s.notifikasi[0].now, NOW);
  assert.equal(s.notifikasi[0].eventKey, 'evt-1');
});

// ─── sinkronkanMilik ────────────────────────────────────────────────────────

const TRANSAKSI_PENDING = { orderId: 'FGO-UJI01', providerRef: 'inv-1', status: 'pending' as const, dibayarPada: null };

const NOTIF_DIBAYAR: NotifikasiGateway = {
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

function statusMenunggu(transaksi: StatusPesananGateway['transaksi'] = TRANSAKSI_PENDING): StatusPesananGateway {
  return { status: 'menunggu_pembayaran', batasBayarPada: PESANAN.batasBayarPada, transaksi };
}

/** statusPesanan dipanggil berurutan; entri terakhir diulang untuk pembacaan berikutnya. */
function buatStoreSinkron(urutan: (StatusPesananGateway | null)[]) {
  const dasar = buatStore();
  let n = 0;
  const store: GatewayStore = {
    ...dasar.store,
    async statusPesanan() {
      const v = urutan[Math.min(n, urutan.length - 1)];
      n += 1;
      return v;
    },
  };
  return { ...dasar, store };
}

function buatProviderSinkron(jawab: NotifikasiGateway | null | Error) {
  const panggilan: { orderId: string; providerRef?: string | null }[] = [];
  const gateway: GatewayProvider = {
    ...buatProvider().gateway,
    async ambilStatus(orderId, providerRef) {
      panggilan.push({ orderId, providerRef });
      if (jawab instanceof Error) throw jawab;
      return jawab;
    },
  };
  return { gateway, panggilan };
}

test('sinkronkanMilik: pesanan bukan milik sesi ini tidak menyentuh gateway', async () => {
  const s = buatStoreSinkron([null]);
  const g = buatProviderSinkron(NOTIF_DIBAYAR);

  assert.deepEqual(await sinkronkanMilik(deps(s.store, g.gateway), PESANAN.kode, 8), { ok: false, kode: 'TIDAK_DITEMUKAN' });
  assert.equal(g.panggilan.length, 0);
});

test('sinkronkanMilik: tanpa transaksi pending / provider_ref tidak memanggil gateway', async () => {
  const kasus: StatusPesananGateway[] = [
    { ...statusMenunggu(null) },
    statusMenunggu({ ...TRANSAKSI_PENDING, status: 'dibayar', dibayarPada: NOW }),
    statusMenunggu({ ...TRANSAKSI_PENDING, providerRef: null }),
    { status: 'terkonfirmasi', batasBayarPada: PESANAN.batasBayarPada, transaksi: TRANSAKSI_PENDING },
  ];

  for (const awal of kasus) {
    const s = buatStoreSinkron([awal]);
    const g = buatProviderSinkron(NOTIF_DIBAYAR);
    const r = await sinkronkanMilik(deps(s.store, g.gateway), PESANAN.kode, 7);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.hasil, null);
      assert.equal(r.status, awal.status);
    }
    assert.equal(g.panggilan.length, 0);
  }
});

test('sinkronkanMilik: menarik status, memproses seperti webhook, lalu membaca ulang status pesanan', async () => {
  const s = buatStoreSinkron([
    statusMenunggu(),
    {
      status: 'terkonfirmasi',
      batasBayarPada: PESANAN.batasBayarPada,
      transaksi: { ...TRANSAKSI_PENDING, status: 'dibayar', dibayarPada: NOW },
    },
  ]);
  const g = buatProviderSinkron(NOTIF_DIBAYAR);
  let batas = 0;
  const d: GatewayDeps = {
    ...deps(s.store, g.gateway),
    throttleSinkron: () => { batas += 1; return { diizinkan: true, ulangiDetik: 0 }; },
  };

  const r = await sinkronkanMilik(d, PESANAN.kode, 7);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.status, 'terkonfirmasi');
  assert.equal(r.transaksi?.status, 'dibayar');
  assert.deepEqual(r.transaksi?.dibayarPada, NOW);
  assert.equal(r.hasil, 'ok');
  assert.equal(batas, 1);
  assert.deepEqual(g.panggilan, [{ orderId: 'FGO-UJI01', providerRef: 'inv-1' }]);
  assert.equal(s.notifikasi.length, 1);
  assert.equal(s.notifikasi[0].provider, 'fake');
});

test('sinkronkanMilik: pembatas per pesanan mencegah panggilan gateway beruntun', async () => {
  const s = buatStoreSinkron([statusMenunggu()]);
  const g = buatProviderSinkron(NOTIF_DIBAYAR);
  const d: GatewayDeps = { ...deps(s.store, g.gateway), throttleSinkron: () => ({ diizinkan: false, ulangiDetik: 7 }) };

  assert.deepEqual(await sinkronkanMilik(d, PESANAN.kode, 7), { ok: false, kode: 'DIBATASI', ulangiDetik: 7 });
  assert.equal(g.panggilan.length, 0);
});

test('sinkronkanMilik: provider tanpa info atau tak terjangkau dilaporkan tanpa mengubah apa pun', async () => {
  const s = buatStoreSinkron([statusMenunggu()]);
  const kosong = buatProviderSinkron(null);
  assert.deepEqual(
    await sinkronkanMilik(deps(s.store, kosong.gateway), PESANAN.kode, 7),
    { ok: false, kode: 'BELUM_ADA_INFO' },
  );

  const putus = buatProviderSinkron(new Error('jaringan putus'));
  assert.deepEqual(
    await sinkronkanMilik(deps(s.store, putus.gateway), PESANAN.kode, 7),
    { ok: false, kode: 'GATEWAY_TIDAK_TERJANGKAU' },
  );
  assert.equal(s.notifikasi.length, 0);
});

// ─── peringatanEnvProduksi ──────────────────────────────────────────────────
test('peringatanEnvProduksi: konfigurasi live lengkap → tanpa peringatan', () => {
  assert.deepEqual(peringatanEnvProduksi({
    provider: 'xendit',
    secretKey: 'xnd_production_abc123',
    callbackToken: 'token-callback',
    appUrl: 'https://fieldgo.id',
  }), []);
});

test('peringatanEnvProduksi: kunci test dipakai di produksi diberi peringatan', () => {
  const p = peringatanEnvProduksi({
    provider: 'xendit',
    secretKey: 'xnd_development_abc123',
    callbackToken: 'token-callback',
    appUrl: 'https://fieldgo.id',
  });
  assert.equal(p.length, 1);
  assert.match(p[0], /kunci test/);
});

test('peringatanEnvProduksi: token kosong dan APP_URL non-HTTPS diberi peringatan', () => {
  const p = peringatanEnvProduksi({
    provider: 'xendit',
    secretKey: 'xnd_production_abc123',
    appUrl: 'http://localhost:3000',
  });
  assert.equal(p.length, 2);
  assert.match(p[0], /XENDIT_CALLBACK_TOKEN/);
  assert.match(p[1], /HTTPS/);
});

test('peringatanEnvProduksi: APP_URL dan secret key kosong diberi peringatan', () => {
  const p = peringatanEnvProduksi({ provider: 'xendit' });
  assert.equal(p.length, 3);
  assert.match(p[0], /XENDIT_SECRET_KEY kosong/);
  assert.match(p[1], /XENDIT_CALLBACK_TOKEN kosong/);
  assert.match(p[2], /APP_URL kosong/);
});

test('peringatanEnvProduksi: provider selain xendit tidak aktif di produksi', () => {
  const p = peringatanEnvProduksi({
    provider: 'fake',
    secretKey: 'xnd_production_abc123',
    callbackToken: 'token-callback',
    appUrl: 'https://fieldgo.id',
  });
  assert.equal(p.length, 1);
  assert.match(p[0], /GATEWAY_PROVIDER/);
});
