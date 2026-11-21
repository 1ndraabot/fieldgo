import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buatXenditGateway } from '../lib/gateway/xendit.ts';
import { statusRefundTersimpan } from '../lib/gateway/rules.ts';
import { pilihGateway } from '../lib/gateway/index.ts';
import type { BuatTransaksiInput } from '../lib/gateway/types.ts';

const TOKEN = 'callback-token-uji';
const KUNCI = 'xnd_development_uji';

const INPUT: BuatTransaksiInput = {
  orderId: 'FGO-X1',
  kode: 'FGO-X1',
  jumlah: 200_000,
  namaPenyewa: 'Rani Putri',
  email: 'rani@email.com',
  itemDetails: [
    { id: 'FGO-X1-20', nama: 'Lapangan A 20.00', harga: 100_000, jumlah: 1 },
    { id: 'FGO-X1-21', nama: 'Lapangan A 21.00', harga: 100_000, jumlah: 1 },
  ],
  kedaluwarsaPada: new Date(Date.now() + 3_600_000),
  selesaiUrl: 'http://localhost:3000/pesanan/FGO-X1/bayar',
  metodeAktif: ['qris', 'bank_transfer'],
};

type Panggilan = { url: string; init: RequestInit };

function buat(jawaban: (url: string, init: RequestInit) => Response | Promise<Response> = () => respon({})) {
  const panggilan: Panggilan[] = [];
  const gateway = buatXenditGateway({
    secretKey: KUNCI,
    callbackToken: TOKEN,
    apiBase: 'https://api.xendit.test',
    fetchImpl: async (input, init = {}) => {
      const url = String(input);
      panggilan.push({ url, init });
      return jawaban(url, init);
    },
  });
  return { gateway, panggilan };
}

const respon = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
});

const callback = (body: unknown, token: string | null = TOKEN) => new Request('http://app.test/api/gateway/xendit', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(token === null ? {} : { 'x-callback-token': token }),
  },
  body: JSON.stringify(body),
});

const isi = (init: RequestInit): Record<string, unknown> => JSON.parse(String(init.body)) as Record<string, unknown>;

// ─── Invoice ────────────────────────────────────────────────────────────────

test('buatTransaksi: body invoice dihitung server, memakai external_id, dan payment_methods Xendit', async () => {
  const { gateway, panggilan } = buat(() => respon({
    id: 'inv-123',
    invoice_url: 'https://checkout.xendit.test/inv-123',
    expiry_date: '2026-11-22T02:00:00.000Z',
    status: 'PENDING',
  }));

  const t = await gateway.buatTransaksi(INPUT);

  assert.equal(panggilan.length, 1);
  assert.equal(panggilan[0].url, 'https://api.xendit.test/v2/invoices');
  assert.equal(panggilan[0].init.method, 'POST');
  assert.equal(
    (panggilan[0].init.headers as Record<string, string>).authorization,
    `Basic ${Buffer.from(`${KUNCI}:`).toString('base64')}`,
  );
  assert.equal((panggilan[0].init.headers as Record<string, string>)['content-type'], 'application/json');

  const b = isi(panggilan[0].init);
  assert.equal(b.external_id, 'FGO-X1');
  assert.equal(b.amount, 200_000);
  assert.equal(b.currency, 'IDR');
  assert.equal(b.payer_email, 'rani@email.com');
  assert.equal(b.should_send_email, false);
  assert.equal(b.locale, 'id');
  assert.equal(b.success_redirect_url, INPUT.selesaiUrl);
  assert.equal(b.failure_redirect_url, INPUT.selesaiUrl);
  assert.deepEqual(b.payment_methods, ['QRIS', 'BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA']);
  assert.deepEqual(b.items, [
    { name: 'Lapangan A 20.00', quantity: 1, price: 100_000 },
    { name: 'Lapangan A 21.00', quantity: 1, price: 100_000 },
  ]);
  assert.ok(typeof b.invoice_duration === 'number' && (b.invoice_duration as number) >= 60);

  assert.deepEqual(t, {
    orderId: 'FGO-X1',
    token: null,
    redirectUrl: 'https://checkout.xendit.test/inv-123',
    kedaluwarsaPada: new Date('2026-11-22T02:00:00.000Z'),
    providerRef: 'inv-123',
  });
});

test('buatTransaksi: metode kosong tidak mengirim payment_methods (semua metode akun)', async () => {
  const { gateway, panggilan } = buat(() => respon({
    id: 'inv-1', invoice_url: 'https://checkout/inv-1', expiry_date: '2026-11-22T00:00:00.000Z',
  }));
  await gateway.buatTransaksi({ ...INPUT, metodeAktif: [] });
  assert.equal('payment_methods' in isi(panggilan[0].init), false);
});

test('buatTransaksi: respons salah / HTTP error tidak menghasilkan transaksi setengah jadi', async () => {
  const { gateway: gagalHttp } = buat(() => respon({ error_code: 'INVALID' }, 401));
  await assert.rejects(() => gagalHttp.buatTransaksi(INPUT), /HTTP 401/);

  const { gateway: tanpaUrl } = buat(() => respon({ id: 'inv-1' }));
  await assert.rejects(() => tanpaUrl.buatTransaksi(INPUT), /invoice_url/);

  const tanpaKunci = buatXenditGateway({
    secretKey: '',
    callbackToken: TOKEN,
    apiBase: 'https://api.xendit.test',
    fetchImpl: async () => respon({}),
  });
  await assert.rejects(() => tanpaKunci.buatTransaksi(INPUT), /XENDIT_SECRET_KEY/);
});

// ─── Callback ───────────────────────────────────────────────────────────────

test('bacaNotifikasi: token salah, kosong, atau tidak ada ditolak', async () => {
  const { gateway } = buat();
  const bodi = { id: 'inv-1', external_id: 'FGO-X1', status: 'PAID' };

  assert.equal(await gateway.bacaNotifikasi(callback(bodi, 'token-salah')), null);
  assert.equal(await gateway.bacaNotifikasi(callback(bodi, null)), null);
  assert.ok(await gateway.bacaNotifikasi(callback(bodi, TOKEN))); // token benar tetap diproses
});

test('bacaNotifikasi invoice: PAID → dibayar, nominal paid_amount, metode payment_channel', async () => {
  const { gateway } = buat();
  const notif = await gateway.bacaNotifikasi(callback({
    id: 'inv-9',
    external_id: 'FGO-X1',
    status: 'PAID',
    amount: 200_000,
    paid_amount: 200_000,
    paid_at: '2026-11-21T03:00:00.000Z',
    payment_method: 'BANK_TRANSFER',
    payment_channel: 'BCA',
  }));

  assert.ok(notif);
  assert.equal(notif.eventKey, 'xendit:invoice:inv-9:PAID');
  assert.equal(notif.orderId, 'FGO-X1');
  assert.equal(notif.providerRef, 'inv-9');
  assert.equal(notif.tipe, 'pembayaran');
  assert.equal(notif.status, 'dibayar');
  assert.equal(notif.jumlah, 200_000);
  assert.equal(notif.metode, 'BCA');
  assert.equal(notif.waktuBayar?.toISOString(), '2026-11-21T03:00:00.000Z');
});

test('bacaNotifikasi invoice: SETTLED/EXPIRED/PENDING dipetakan sesuai status internal', async () => {
  const { gateway } = buat();
  const status = async (s: string) => (await gateway.bacaNotifikasi(callback({
    id: `inv-${s}`, external_id: 'FGO-X1', status: s, amount: 1,
  })))?.status;

  assert.equal(await status('SETTLED'), 'dibayar');
  assert.equal(await status('EXPIRED'), 'kedaluwarsa');
  assert.equal(await status('PENDING'), 'pending');
  assert.equal(await status('ANEh'), 'perlu_tinjau');
});

test('bacaNotifikasi: callback berulang menghasilkan eventKey yang sama (idempoten)', async () => {
  const { gateway } = buat();
  const bodi = { id: 'inv-7', external_id: 'FGO-X1', status: 'PAID', amount: 200_000 };
  const a = await gateway.bacaNotifikasi(callback(bodi));
  const b = await gateway.bacaNotifikasi(callback(bodi));
  assert.equal(a?.eventKey, b?.eventKey);
});

test('bacaNotifikasi refund: succeeded/pending = refund, failed diabaikan; lookup lewat invoice_id', async () => {
  const { gateway } = buat();
  const refund = async (status: string) => gateway.bacaNotifikasi(callback({
    id: `ref-${status}`,
    invoice_id: 'inv-9',
    status,
    amount: 150_000,
    created: '2026-11-21T04:00:00.000Z',
  }));

  const sukses = await refund('succeeded');
  assert.ok(sukses);
  assert.equal(sukses.eventKey, 'xendit:refund:ref-succeeded:succeeded');
  assert.equal(sukses.orderId, ''); // diresolusi store lewat providerRef
  assert.equal(sukses.providerRef, 'inv-9');
  assert.equal(sukses.tipe, 'refund');
  assert.equal(sukses.status, 'refund');
  assert.equal(sukses.jumlah, 150_000);

  assert.equal((await refund('pending'))?.status, 'refund');
  assert.equal((await refund('failed'))?.status, 'pending'); // event audit, store mengabaikan
});

// ─── Sinkron & refund ───────────────────────────────────────────────────────

test('ambilStatus: memakai invoice id dan memetakan hasil seperti callback', async () => {
  const { gateway, panggilan } = buat(() => respon({
    id: 'inv-9',
    external_id: 'FGO-X1',
    status: 'PAID',
    paid_amount: 200_000,
    paid_at: '2026-11-21T03:00:00.000Z',
    payment_channel: 'QRIS',
  }));

  const notif = await gateway.ambilStatus('FGO-X1', 'inv-9');
  assert.equal(panggilan[0].url, 'https://api.xendit.test/v2/invoices/inv-9');
  assert.equal(panggilan[0].init.method, 'GET');
  assert.equal(notif?.status, 'dibayar');
  assert.equal(notif?.eventKey, 'xendit:invoice:inv-9:PAID');
  assert.equal(notif?.metode, 'QRIS');
});

test('ambilStatus: tanpa provider_ref mencari lewat external_id; 404 = null', async () => {
  const { gateway, panggilan } = buat(() => respon([{
    id: 'inv-1', external_id: 'FGO-X1', status: 'PENDING', amount: 200_000,
  }]));
  const notif = await gateway.ambilStatus('FGO-X1');
  assert.equal(panggilan[0].url, 'https://api.xendit.test/v2/invoices?external_id=FGO-X1&limit=1');
  assert.equal(notif?.status, 'pending');

  const { gateway: kosong } = buat(() => respon({ message: 'not found' }, 404));
  assert.equal(await kosong.ambilStatus('FGO-X1', 'inv-tidak-ada'), null);
});

test('refund: wajib invoice id, mengirim body yang benar, dan menerjemahkan kegagalan', async () => {
  const { gateway: tanpaRef, panggilan: p0 } = buat();
  assert.deepEqual(await tanpaRef.refund('FGO-X1', 200_000, 'Batal'), { ok: false, kode: 'TANPA_REFERENCE' });
  assert.equal(p0.length, 0);

  const { gateway, panggilan } = buat(() => respon({ id: 'ref-1', status: 'succeeded' }));
  const hasil = await gateway.refund('FGO-X1', 200_000, 'Refund pesanan FieldGo', 'inv-9');
  assert.deepEqual(hasil, { ok: true, reference: 'ref-1' });
  assert.equal(panggilan[0].url, 'https://api.xendit.test/refunds');
  assert.equal((panggilan[0].init.headers as Record<string, string>)['api-version'], '2024-11-11');
  assert.deepEqual(isi(panggilan[0].init), {
    invoice_id: 'inv-9', amount: 200_000, reason: 'REQUESTED_BY_CUSTOMER',
  });

  const { gateway: ditolak } = buat(() => respon({ id: 'ref-2', status: 'failed' }));
  assert.deepEqual(await ditolak.refund('FGO-X1', 200_000, 'Batal', 'inv-9'), { ok: false, kode: 'REFUND_DITOLAK' });

  const { gateway: http } = buat(() => respon({ error_code: 'INSUFFICIENT_BALANCE' }, 400));
  assert.deepEqual(await http.refund('FGO-X1', 200_000, 'Batal', 'inv-9'), { ok: false, kode: 'REFUND_DITOLAK' });
});

// ─── Aturan & pemilihan provider ────────────────────────────────────────────

test('statusRefundTersimpan: nominal lebih kecil dari tagihan = sebagian_refund', () => {
  assert.equal(statusRefundTersimpan('refund', 200_000, 200_000), 'refund');
  assert.equal(statusRefundTersimpan('refund', 150_000, 200_000), 'sebagian_refund');
  assert.equal(statusRefundTersimpan('refund', null, 200_000), 'refund');
  assert.equal(statusRefundTersimpan('sebagian_refund', 200_000, 200_000), 'sebagian_refund');
});

function denganEnv(ubah: Record<string, string | undefined>, fn: () => void) {
  const lama: Record<string, string | undefined> = {};
  for (const k of Object.keys(ubah)) {
    lama[k] = process.env[k];
    if (ubah[k] === undefined) delete process.env[k];
    else process.env[k] = ubah[k] as string;
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(ubah)) {
      if (lama[k] === undefined) delete process.env[k];
      else process.env[k] = lama[k];
    }
  }
}

test('pilihGateway: production default xendit, fake hanya non-production', () => {
  denganEnv({ NODE_ENV: 'production', GATEWAY_PROVIDER: undefined }, () => {
    assert.equal(pilihGateway().nama, 'xendit');
  });
  denganEnv({ NODE_ENV: 'production', GATEWAY_PROVIDER: 'fake' }, () => {
    assert.notEqual(pilihGateway().nama, 'fake'); // env salah tidak boleh memakai simulasi
  });
  denganEnv({ NODE_ENV: 'test', GATEWAY_PROVIDER: 'fake' }, () => {
    assert.equal(pilihGateway().nama, 'fake');
  });
  denganEnv({ NODE_ENV: 'test', GATEWAY_PROVIDER: 'xendit' }, () => {
    assert.equal(pilihGateway().nama, 'xendit');
  });
});
