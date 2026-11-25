import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buatXenditGateway } from '../lib/gateway/xendit.ts';
import { statusRefundTersimpan, simulasiTestAktif } from '../lib/gateway/rules.ts';
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
    metode: null,
    instruksi: null,
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

// ─── Payment Requests v3 ────────────────────────────────────────────────────

const EXPIRES = '2026-11-22T02:00:00.000Z';

const INPUT_V3: BuatTransaksiInput = {
  ...INPUT,
  metode: 'QRIS',
  kedaluwarsaPada: new Date(EXPIRES),
};

test('buatTransaksi v3 QRIS: body server-side dan instruksi QR dari actions', async () => {
  const { gateway, panggilan } = buat(() => respon({
    payment_request_id: 'pr-abc-1',
    reference_id: 'FGO-X1',
    channel_code: 'QRIS',
    status: 'REQUIRES_ACTION',
    request_amount: 200_000,
    channel_properties: { expires_at: EXPIRES },
    actions: [{ type: 'PRESENT_TO_CUSTOMER', descriptor: 'QR_STRING', value: 'qr-string-0001' }],
  }, 201));

  const t = await gateway.buatTransaksi(INPUT_V3);

  assert.equal(panggilan[0].url, 'https://api.xendit.test/v3/payment_requests');
  assert.equal(panggilan[0].init.method, 'POST');
  const h = panggilan[0].init.headers as Record<string, string>;
  assert.equal(h['api-version'], '2024-11-11');
  assert.equal(h.authorization, `Basic ${Buffer.from(`${KUNCI}:`).toString('base64')}`);

  const b = isi(panggilan[0].init);
  assert.equal(b.type, 'PAY');
  assert.equal(b.country, 'ID');
  assert.equal(b.currency, 'IDR');
  assert.equal(b.request_amount, 200_000);
  assert.equal(b.reference_id, 'FGO-X1');
  assert.equal(b.channel_code, 'QRIS');
  assert.deepEqual(b.channel_properties, { expires_at: EXPIRES });

  assert.deepEqual(t, {
    orderId: 'FGO-X1',
    token: 'qr-string-0001',
    redirectUrl: null,
    kedaluwarsaPada: new Date(EXPIRES),
    providerRef: 'pr-abc-1',
    metode: 'QRIS',
    instruksi: { jenis: 'qr', nilai: 'qr-string-0001', kedaluwarsaPada: new Date(EXPIRES) },
  });
});

test('buatTransaksi v3 VA: display_name + nomor VA; e-wallet: return URL + redirect', async () => {
  const va = buat(() => respon({
    payment_request_id: 'pr-va-1', reference_id: 'FGO-X1', channel_code: 'BCA_VIRTUAL_ACCOUNT',
    status: 'REQUIRES_ACTION', channel_properties: { expires_at: EXPIRES },
    actions: [{ type: 'PRESENT_TO_CUSTOMER', descriptor: 'VIRTUAL_ACCOUNT_NUMBER', value: '381659999033910' }],
  }, 201));
  const tVa = await va.gateway.buatTransaksi({ ...INPUT_V3, metode: 'BCA_VIRTUAL_ACCOUNT' });
  assert.deepEqual(isi(va.panggilan[0].init).channel_properties, { display_name: 'FieldGo', expires_at: EXPIRES });
  assert.deepEqual(tVa.instruksi, { jenis: 'va', nomor: '381659999033910', bank: 'BCA', kedaluwarsaPada: new Date(EXPIRES) });
  assert.equal(tVa.token, '381659999033910');
  assert.equal(tVa.redirectUrl, null);

  const dana = buat(() => respon({
    payment_request_id: 'pr-dana-1', reference_id: 'FGO-X1', channel_code: 'DANA',
    status: 'REQUIRES_ACTION', channel_properties: { expires_at: EXPIRES },
    actions: [{ type: 'REDIRECT_CUSTOMER', descriptor: 'WEB_URL', value: 'https://dana.test/pay/1' }],
  }, 201));
  const tDana = await dana.gateway.buatTransaksi({ ...INPUT_V3, metode: 'DANA' });
  assert.deepEqual(isi(dana.panggilan[0].init).channel_properties, {
    success_return_url: INPUT_V3.selesaiUrl, failure_return_url: INPUT_V3.selesaiUrl, expires_at: EXPIRES,
  });
  assert.deepEqual(tDana.instruksi, {
    jenis: 'redirect', url: 'https://dana.test/pay/1', kedaluwarsaPada: new Date(EXPIRES),
  });
  assert.equal(tDana.token, null);
  assert.equal(tDana.redirectUrl, 'https://dana.test/pay/1');
});

test('buatTransaksi v3 ShopeePay: URL redirect dipilih meski QR juga tersedia', async () => {
  const { gateway } = buat(() => respon({
    payment_request_id: 'pr-sp-1', reference_id: 'FGO-X1', channel_code: 'SHOPEEPAY',
    status: 'REQUIRES_ACTION',
    actions: [
      { type: 'REDIRECT_CUSTOMER', descriptor: 'DEEPLINK_URL', value: 'https://shopeepay.test/deeplink' },
      { type: 'PRESENT_TO_CUSTOMER', descriptor: 'QR_STRING', value: 'qr-shopeepay' },
    ],
  }, 201));
  const t = await gateway.buatTransaksi({ ...INPUT_V3, metode: 'SHOPEEPAY' });
  assert.deepEqual(t.instruksi, {
    jenis: 'redirect', url: 'https://shopeepay.test/deeplink', kedaluwarsaPada: new Date(EXPIRES),
  });
  assert.equal(t.token, 'qr-shopeepay'); // QR tetap disimpan untuk audit/simulasi
});

test('buatTransaksi v3: respons tanpa instruksi atau kanal tak dikenal ditolak', async () => {
  const { gateway: kosong } = buat(() => respon({
    payment_request_id: 'pr-1', reference_id: 'FGO-X1', status: 'REQUIRES_ACTION',
  }, 201));
  await assert.rejects(() => kosong.buatTransaksi(INPUT_V3), /tanpa instruksi/);

  const { gateway: asing } = buat(() => respon({}, 201));
  await assert.rejects(() => asing.buatTransaksi({ ...INPUT_V3, metode: 'OVO' }), /tidak dikenal/);

  const { gateway: tanpaId } = buat(() => respon({ status: 'REQUIRES_ACTION' }, 201));
  await assert.rejects(() => tanpaId.buatTransaksi(INPUT_V3), /payment_request_id/);
});

test('bacaNotifikasi v3: payment.capture → dibayar, nominal dari captures, reference_id = orderId', async () => {
  const { gateway } = buat();
  const notif = await gateway.bacaNotifikasi(callback({
    event: 'payment.capture',
    data: {
      payment_id: 'pay-1',
      payment_request_id: 'pr-abc-1',
      reference_id: 'FGO-X1',
      status: 'SUCCEEDED',
      channel_code: 'QRIS',
      request_amount: 200_000,
      captures: [{ capture_amount: 200_000, capture_timestamp: '2026-11-21T03:00:00.000Z' }],
    },
  }));

  assert.ok(notif);
  assert.equal(notif.eventKey, 'xendit:payment_request:pr-abc-1:SUCCEEDED');
  assert.equal(notif.orderId, 'FGO-X1');
  assert.equal(notif.providerRef, 'pr-abc-1');
  assert.equal(notif.tipe, 'pembayaran');
  assert.equal(notif.status, 'dibayar');
  assert.equal(notif.jumlah, 200_000);
  assert.equal(notif.metode, 'QRIS');
  assert.equal(notif.waktuBayar?.toISOString(), '2026-11-21T03:00:00.000Z');
});

test('bacaNotifikasi v3: payment.failure → gagal; payment.authorization → pending', async () => {
  const { gateway } = buat();
  const status = async (event: string, s: string) =>
    (await gateway.bacaNotifikasi(callback({
      event, data: { payment_request_id: 'pr-1', reference_id: 'FGO-X1', status: s, request_amount: 1 },
    })))?.status;

  assert.equal(await status('payment.failure', 'FAILED'), 'gagal');
  assert.equal(await status('payment.authorization', 'AUTHORIZED'), 'pending');
});

test('bacaNotifikasi v3 refund: succeeded → refund lewat reference_id; failed hanya audit', async () => {
  const { gateway } = buat();
  const refund = async (event: string) => gateway.bacaNotifikasi(callback({
    event,
    data: {
      refund_id: `ref-${event}`,
      reference_id: 'FGO-X1',
      payment_request_id: 'pr-abc-1',
      status: event.split('.').pop(),
      amount: 150_000,
      created: '2026-11-21T04:00:00.000Z',
    },
  }));

  const sukses = await refund('refund.succeeded');
  assert.ok(sukses);
  assert.equal(sukses.eventKey, 'xendit:refund:ref-refund.succeeded:succeeded');
  assert.equal(sukses.orderId, 'FGO-X1'); // reference_id memungkinkan resolusi langsung
  assert.equal(sukses.providerRef, 'pr-abc-1');
  assert.equal(sukses.tipe, 'refund');
  assert.equal(sukses.status, 'refund');
  assert.equal(sukses.jumlah, 150_000);

  assert.equal((await refund('refund.failed'))?.status, 'pending'); // event audit, store mengabaikan
});

test('bacaNotifikasi: callback invoice v2 tetap dikenali di samping v3', async () => {
  const { gateway } = buat();
  const notif = await gateway.bacaNotifikasi(callback({
    id: 'inv-9', external_id: 'FGO-X1', status: 'PAID', amount: 200_000, paid_amount: 200_000,
  }));
  assert.ok(notif);
  assert.equal(notif.eventKey, 'xendit:invoice:inv-9:PAID');
  assert.equal(notif.orderId, 'FGO-X1');
});

test('ambilStatus: prefix pr- memakai Payment Requests v3 dan memetakan status', async () => {
  const { gateway, panggilan } = buat(() => respon({
    payment_request_id: 'pr-abc-1',
    reference_id: 'FGO-X1',
    status: 'SUCCEEDED',
    channel_code: 'QRIS',
    request_amount: 200_000,
    latest_payment_id: 'pay-9',
    latest_payment: {
      payment_id: 'pay-9',
      channel_code: 'QRIS',
      captures: [{ capture_amount: 200_000, capture_timestamp: '2026-11-21T03:00:00.000Z' }],
    },
  }));

  const notif = await gateway.ambilStatus('FGO-X1', 'pr-abc-1');
  assert.equal(panggilan[0].url, 'https://api.xendit.test/v3/payment_requests/pr-abc-1');
  assert.equal(panggilan[0].init.method, 'GET');
  assert.equal(notif?.status, 'dibayar');
  assert.equal(notif?.eventKey, 'xendit:payment_request:pr-abc-1:SUCCEEDED');
  assert.equal(notif?.jumlah, 200_000);
  assert.equal(notif?.metode, 'QRIS');
  assert.equal(notif?.waktuBayar?.toISOString(), '2026-11-21T03:00:00.000Z');

  const { gateway: kosong } = buat(() => respon({ message: 'not found' }, 404));
  assert.equal(await kosong.ambilStatus('FGO-X1', 'pr-tidak-ada'), null);
});

test('refund v3: ambil payment_id dari detail PR lalu POST /v3/refunds', async () => {
  const { gateway, panggilan } = buat((url) => {
    if (url.endsWith('/v3/payment_requests/pr-abc-1')) {
      return respon({ payment_request_id: 'pr-abc-1', latest_payment_id: 'pay-9' });
    }
    return respon({ refund_id: 'ref-77', status: 'COMPLETED' }, 201);
  });

  const hasil = await gateway.refund('FGO-X1', 200_000, 'Refund pesanan FieldGo', 'pr-abc-1');
  assert.deepEqual(hasil, { ok: true, reference: 'ref-77' });
  assert.equal(panggilan.length, 2);
  assert.equal(panggilan[1].url, 'https://api.xendit.test/v3/refunds');
  assert.deepEqual(isi(panggilan[1].init), {
    reference_id: 'FGO-X1', payment_id: 'pay-9', amount: 200_000, reason: 'REQUESTED_BY_CUSTOMER',
  });
});

test('refund v3: PR tanpa payment tertagih jatuh ke refund manual', async () => {
  const { gateway, panggilan } = buat(() =>
    respon({ payment_request_id: 'pr-abc-1', status: 'SUCCEEDED' }));
  assert.deepEqual(await gateway.refund('FGO-X1', 200_000, 'Batal', 'pr-abc-1'), { ok: false, kode: 'TANPA_PAYMENT' });
  assert.equal(panggilan.length, 1); // tidak mencoba POST refunds

  const { gateway: gagal } = buat((url) => {
    if (url.endsWith('/v3/payment_requests/pr-abc-1')) {
      return respon({ payment_request_id: 'pr-abc-1', latest_payment_id: 'pay-9' });
    }
    return respon({ error_code: 'REFUND_NOT_ALLOWED' }, 400);
  });
  assert.deepEqual(await gagal.refund('FGO-X1', 200_000, 'Batal', 'pr-abc-1'), { ok: false, kode: 'REFUND_DITOLAK' });
});

test('batalkan: pr- memakai cancel v3; invoice memakai expire v2; kegagalan ditelan', async () => {
  const { gateway, panggilan } = buat(() => respon({}, 200));
  await gateway.batalkan?.('pr-abc-1');
  assert.equal(panggilan[0].url, 'https://api.xendit.test/v3/payment_requests/pr-abc-1/cancel');
  assert.equal(panggilan[0].init.method, 'POST');

  await gateway.batalkan?.('inv-9');
  assert.equal(panggilan[1].url, 'https://api.xendit.test/v2/invoices/inv-9/expire');

  const { gateway: rusak } = buat(() => { throw new Error('jaringan putus'); });
  await assert.doesNotReject(async () => { await rusak.batalkan?.('pr-abc-1'); }); // best effort
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

// ─── Simulasi pembayaran (test mode) ────────────────────────────────────────

test('simulasiTestAktif: kunci test + non-production selalu; production hanya dengan saklar', () => {
  const e = { provider: 'xendit', secretKey: 'xnd_development_abc', nodeEnv: 'development' };
  assert.equal(simulasiTestAktif(e), true);
  // Production terkunci tanpa saklar; hanya nilai persis "true" yang membuka.
  assert.equal(simulasiTestAktif({ ...e, nodeEnv: 'production' }), false);
  assert.equal(simulasiTestAktif({ ...e, nodeEnv: 'production', izinFlag: 'true' }), true);
  assert.equal(simulasiTestAktif({ ...e, nodeEnv: 'production', izinFlag: 'True' }), false);
  assert.equal(simulasiTestAktif({ ...e, nodeEnv: 'production', izinFlag: '1' }), false);
  // Kunci live tetap ditolak walau saklar aktif — tidak ada simulasi di pembayaran sungguhan.
  assert.equal(simulasiTestAktif({ ...e, nodeEnv: 'production', secretKey: 'xnd_production_abc', izinFlag: 'true' }), false);
  assert.equal(simulasiTestAktif({ ...e, nodeEnv: 'development', secretKey: 'xnd_production_abc', izinFlag: 'true' }), false);
  assert.equal(simulasiTestAktif({ ...e, secretKey: undefined }), false);
  assert.equal(simulasiTestAktif({ ...e, provider: 'fake' }), false);
});

test('simulasikanPembayaran: memanggil endpoint simulasi resmi dengan nominal pesanan', async () => {
  const { gateway, panggilan } = buat(() => respon({ status: 'PENDING', message: 'sedang diproses' }));

  const r = await gateway.simulasikanPembayaran!('FGO-X1', 'pr-abc-1', 200_000);

  assert.deepEqual(r, { ok: true });
  assert.equal(panggilan.length, 1);
  assert.equal(panggilan[0].url, 'https://api.xendit.test/v3/payment_requests/pr-abc-1/simulate');
  assert.equal(panggilan[0].init.method, 'POST');
  assert.equal((panggilan[0].init.headers as Record<string, string>)['api-version'], '2024-11-11');
  assert.equal(isi(panggilan[0].init).amount, 200_000);
});

test('simulasikanPembayaran: PR 404, HTTP error, dan invoice lama ditolak', async () => {
  const { gateway: kosong } = buat(() => respon({ message: 'not found' }, 404));
  assert.deepEqual(await kosong.simulasikanPembayaran!('FGO-X1', 'pr-abc-1', 1), { ok: false, kode: 'TIDAK_DITEMUKAN' });

  const { gateway: rusak } = buat(() => respon({ error_code: 'SERVER_ERROR' }, 500));
  assert.deepEqual(await rusak.simulasikanPembayaran!('FGO-X1', 'pr-abc-1', 1), { ok: false, kode: 'GATEWAY_GAGAL' });

  const { gateway: invoice } = buat();
  assert.deepEqual(await invoice.simulasikanPembayaran!('FGO-X1', 'inv-9', 1), { ok: false, kode: 'BUKAN_PAYMENT_REQUEST' });
});

test('simulasikanPembayaran: production terkunci kecuali saklar demo; kunci live selalu ditolak', async () => {
  const NODE_ENV: string = 'NODE_ENV';
  const SAKLAR: string = 'GATEWAY_SIMULASI_TEST';
  const lama = { node: process.env[NODE_ENV], saklar: process.env[SAKLAR] };
  try {
    process.env[NODE_ENV] = 'production';
    delete process.env[SAKLAR];

    const { gateway, panggilan } = buat(); // kunci development, production tanpa saklar
    assert.deepEqual(await gateway.simulasikanPembayaran!('FGO-X1', 'pr-abc-1', 200_000), { ok: false, kode: 'HANYA_TEST' });
    assert.equal(panggilan.length, 0);

    process.env[SAKLAR] = 'true'; // saklar demo membuka jalur di production
    const { gateway: dibuka, panggilan: p2 } = buat(() => respon({ status: 'PENDING', message: 'diproses' }));
    assert.deepEqual(await dibuka.simulasikanPembayaran!('FGO-X1', 'pr-abc-1', 200_000), { ok: true });
    assert.equal(p2.length, 1);
    assert.equal(p2[0].url, 'https://api.xendit.test/v3/payment_requests/pr-abc-1/simulate');

    process.env[NODE_ENV] = 'development'; // kunci live ditolak di env mana pun
    const panggilanLive: Panggilan[] = [];
    const live = buatXenditGateway({
      secretKey: 'xnd_production_uji',
      callbackToken: TOKEN,
      apiBase: 'https://api.xendit.test',
      fetchImpl: async (input, init = {}) => {
        panggilanLive.push({ url: String(input), init });
        return respon({});
      },
    });
    assert.deepEqual(await live.simulasikanPembayaran!('FGO-X1', 'pr-abc-1', 1), { ok: false, kode: 'HANYA_TEST' });
    assert.equal(panggilanLive.length, 0);
  } finally {
    if (lama.node === undefined) delete process.env[NODE_ENV];
    else process.env[NODE_ENV] = lama.node;
    if (lama.saklar === undefined) delete process.env[SAKLAR];
    else process.env[SAKLAR] = lama.saklar;
  }
});
