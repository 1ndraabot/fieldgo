import { kanalDari } from './kanal.ts';
import {
  durasiInvoiceDetik, petakanMetodeXendit, petakanStatusPaymentRequest, petakanStatusRefundXendit,
  petakanStatusXendit, samakanAmanWaktu,
} from './rules.ts';
import type {
  BuatTransaksiInput, GatewayProvider, HasilRefundGateway, InstruksiPembayaran, NotifikasiGateway,
  TransaksiGateway,
} from './types.ts';

const API_BASE = 'https://api.xendit.co';
const API_VERSION = '2024-11-11';
const TIMEOUT_MS = 15_000;
/** Enum yang diterima Refunds API; semua refund FieldGo adalah permintaan pengguna/admin. */
const ALASAN_REFUND = 'REQUESTED_BY_CUSTOMER';
const NAMA_MERCHANT = 'FieldGo';

type FetchImpl = typeof globalThis.fetch;

type OpsiXendit = {
  secretKey?: string;
  callbackToken?: string;
  fetchImpl?: FetchImpl;
  apiBase?: string;
};

const ambilJson = async (res: Response): Promise<Record<string, unknown> | null> => {
  try {
    const body: unknown = await res.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const tanggal = (v: unknown): Date | null => {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t);
};

const angka = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const teks = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const objek = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;

const daftar = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Xendit menaruh payload v3 di `data`; sebagian endpoint mengirim objek datar. */
const dataDari = (b: Record<string, unknown>): Record<string, unknown> => objek(b.data) ?? b;

/** Nilai action PRESENT_TO_CUSTOMER (QR string / nomor VA). */
function nilaiAction(actions: unknown[], deskriptor: string[]): string | null {
  for (const a of actions) {
    const o = objek(a);
    if (!o) continue;
    const desc = teks(o.descriptor);
    if (desc && deskriptor.includes(desc)) {
      const v = teks(o.value);
      if (v) return v;
    }
  }
  return null;
}

/** E-wallet: utamakan URL redirect, baru fallback deeplink/web URL. */
function urlRedirect(actions: unknown[]): string | null {
  for (const a of actions) {
    const o = objek(a);
    if (!o) continue;
    if (teks(o.type) === 'REDIRECT_CUSTOMER') {
      const v = teks(o.value);
      if (v) return v;
    }
  }
  return nilaiAction(actions, ['WEB_URL', 'DEEPLINK_URL', 'REDIRECT_URL']);
}

/** Total capture dari payload Payment API v3; null bila tidak ada. */
function totalCapture(d: Record<string, unknown>): number | null {
  const captures = daftar(d.captures);
  if (!captures.length) return null;
  let total = 0;
  for (const c of captures) {
    const o = objek(c);
    const n = o ? angka(o.capture_amount) : null;
    if (n === null) return null;
    total += n;
  }
  return total;
}

/** Waktu capture terakhir; null bila tidak ada. */
function waktuCapture(d: Record<string, unknown>): Date | null {
  const captures = daftar(d.captures);
  for (let i = captures.length - 1; i >= 0; i--) {
    const o = objek(captures[i]);
    const t = o ? tanggal(o.capture_timestamp) : null;
    if (t) return t;
  }
  return null;
}

/**
 * Provider Xendit Payment Requests v3 (tanpa SDK) dengan fallback Invoice v2
 * untuk transaksi lama/legacy. Kredensial dibaca dari environment saat dipanggil
 * agar build tidak bergantung pada .env.
 */
export function buatXenditGateway(o: OpsiXendit = {}): GatewayProvider {
  const kunci = () => o.secretKey ?? process.env.XENDIT_SECRET_KEY ?? '';
  const tokenCallback = () => o.callbackToken ?? process.env.XENDIT_CALLBACK_TOKEN ?? '';
  const apiBase = o.apiBase ?? API_BASE;
  const panggil: FetchImpl = o.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  const headers = (): Record<string, string> => {
    const secret = kunci();
    if (!secret) throw new Error('XENDIT_SECRET_KEY belum diisi');
    return {
      authorization: `Basic ${Buffer.from(`${secret}:`).toString('base64')}`,
      'content-type': 'application/json',
    };
  };

  const permintaan = async (path: string, init: RequestInit): Promise<Response> => {
    const h: Record<string, string> = { ...headers(), ...(init.headers as Record<string, string> | undefined) };
    // Payment Requests & Refunds v3 mewajibkan versi API; endpoint v2 tidak.
    if (path.startsWith('/v3/') && !h['api-version']) h['api-version'] = API_VERSION;
    return panggil(`${apiBase}${path}`, { ...init, headers: h, signal: AbortSignal.timeout(TIMEOUT_MS) });
  };

  const notifikasiInvoice = (b: Record<string, unknown>, orderIdFallback = ''): NotifikasiGateway | null => {
    const id = teks(b.id);
    const orderId = teks(b.external_id) ?? orderIdFallback;
    const statusMentah = teks(b.status);
    if (!id || !orderId || !statusMentah) return null;

    return {
      eventKey: `xendit:invoice:${id}:${statusMentah.toUpperCase()}`,
      orderId,
      providerRef: id,
      tipe: 'pembayaran',
      status: petakanStatusXendit(statusMentah),
      metode: teks(b.payment_channel) ?? teks(b.payment_method),
      jumlah: angka(b.paid_amount) ?? angka(b.amount),
      waktuBayar: tanggal(b.paid_at),
      payload: b,
    };
  };

  /** GET payment request / objek PR datar. */
  const notifikasiPaymentRequest = (b: Record<string, unknown>, orderIdFallback = ''): NotifikasiGateway | null => {
    const id = teks(b.payment_request_id) ?? teks(b.id);
    const orderId = teks(b.reference_id) ?? orderIdFallback;
    const statusMentah = teks(b.status);
    if (!id || !orderId || !statusMentah) return null;

    const latest = objek(b.latest_payment);
    return {
      eventKey: `xendit:payment_request:${id}:${statusMentah.toUpperCase()}`,
      orderId,
      providerRef: id,
      tipe: 'pembayaran',
      status: petakanStatusPaymentRequest(statusMentah),
      metode: teks(b.channel_code) ?? (latest ? teks(latest.channel_code) : null),
      jumlah: (latest ? totalCapture(latest) : null) ?? angka(b.request_amount) ?? angka(b.amount),
      waktuBayar: (latest ? waktuCapture(latest) : null)
        ?? (statusMentah.toUpperCase() === 'SUCCEEDED' ? tanggal(b.updated) : null),
      payload: b,
    };
  };

  /** Webhook `payment.capture` / `payment.failure` / `payment.authorization`. */
  const notifikasiPembayaranV3 = (event: string, d: Record<string, unknown>): NotifikasiGateway | null => {
    const prId = teks(d.payment_request_id);
    const paymentId = teks(d.payment_id);
    const orderId = teks(d.reference_id) ?? '';
    const id = prId ?? paymentId;
    if (!id) return null;

    const ev = event.toLowerCase();
    const status = ev === 'payment.capture' ? 'dibayar' : ev === 'payment.failure' ? 'gagal' : 'pending';
    const statusKey = (teks(d.status) ?? event).toUpperCase();
    return {
      eventKey: `xendit:payment_request:${id}:${statusKey}`,
      orderId,
      providerRef: prId,
      tipe: 'pembayaran',
      status,
      metode: teks(d.channel_code),
      jumlah: totalCapture(d) ?? angka(d.request_amount) ?? angka(d.amount),
      waktuBayar: waktuCapture(d) ?? tanggal(d.created) ?? tanggal(d.updated),
      payload: d,
    };
  };

  /** Webhook `refund.succeeded` / `refund.failed`. */
  const notifikasiRefundV3 = (event: string, d: Record<string, unknown>): NotifikasiGateway | null => {
    const refundId = teks(d.refund_id) ?? teks(d.id);
    const orderId = teks(d.reference_id) ?? '';
    if (!refundId && !orderId) return null;

    const statusMentah = teks(d.status) ?? event.split('.').pop() ?? '';
    const refund = petakanStatusRefundXendit(statusMentah);
    return {
      eventKey: `xendit:refund:${refundId ?? orderId}:${statusMentah.toLowerCase()}`,
      orderId,
      providerRef: teks(d.payment_request_id),
      tipe: 'refund',
      // Status selain sukses/pending tetap dicatat sebagai audit, tetapi store mengabaikannya
      // karena pembayaran sudah lunas.
      status: refund === 'refund' ? 'refund' : 'pending',
      metode: null,
      jumlah: angka(d.amount) ?? angka(d.refund_amount),
      waktuBayar: tanggal(d.created) ?? tanggal(d.updated),
      payload: d,
    };
  };

  const propertiKanal = (i: BuatTransaksiInput, kanal: ReturnType<typeof kanalDari>): Record<string, string> => {
    const expires = i.kedaluwarsaPada.toISOString();
    if (kanal?.grup === 'va') return { display_name: NAMA_MERCHANT, expires_at: expires };
    if (kanal?.grup === 'qris') return { expires_at: expires };
    return { success_return_url: i.selesaiUrl, failure_return_url: i.selesaiUrl, expires_at: expires };
  };

  /** Fallback Invoice v2 untuk transaksi lama / pemanggil tanpa metode. */
  const buatInvoiceV2 = async (i: BuatTransaksiInput): Promise<TransaksiGateway> => {
    const body = {
      external_id: i.orderId,
      amount: i.jumlah,
      currency: 'IDR',
      payer_email: i.email,
      description: `Pesanan ${i.kode} — ${i.namaPenyewa}`.slice(0, 255),
      customer: { given_names: i.namaPenyewa, email: i.email },
      items: i.itemDetails.map((x) => ({ name: x.nama.slice(0, 255), quantity: x.jumlah, price: x.harga })),
      invoice_duration: durasiInvoiceDetik(i.kedaluwarsaPada, new Date()),
      success_redirect_url: i.selesaiUrl,
      failure_redirect_url: i.selesaiUrl,
      should_send_email: false,
      locale: 'id',
      ...(i.metodeAktif && i.metodeAktif.length
        ? { payment_methods: petakanMetodeXendit(i.metodeAktif) }
        : {}),
    };

    const res = await permintaan('/v2/invoices', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Xendit invoice gagal (HTTP ${res.status})`);

    const data = await ambilJson(res);
    const id = teks(data?.id);
    const url = teks(data?.invoice_url);
    if (!id || !url) throw new Error('Xendit invoice tanpa id/invoice_url');

    return {
      orderId: i.orderId,
      token: null,
      redirectUrl: url,
      kedaluwarsaPada: tanggal(data?.expiry_date) ?? i.kedaluwarsaPada,
      providerRef: id,
      metode: null,
      instruksi: null,
    };
  };

  /** Payment Request v3: QRIS/VA dirender sendiri, e-wallet tetap redirect. */
  const buatPaymentRequest = async (i: BuatTransaksiInput): Promise<TransaksiGateway> => {
    const metode = i.metode as string;
    const kanal = kanalDari(metode);
    if (!kanal) throw new Error(`Kanal pembayaran tidak dikenal: ${metode}`);

    const body = {
      type: 'PAY',
      country: 'ID',
      currency: 'IDR',
      request_amount: i.jumlah,
      description: `Pesanan ${i.kode} — ${i.namaPenyewa}`.slice(0, 255),
      reference_id: i.orderId,
      channel_code: metode,
      channel_properties: propertiKanal(i, kanal),
    };

    const res = await permintaan('/v3/payment_requests', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Xendit payment request gagal (HTTP ${res.status})`);

    const data = await ambilJson(res);
    const id = teks(data?.payment_request_id) ?? teks(data?.id);
    if (!id) throw new Error('Xendit payment request tanpa payment_request_id');

    const actions = daftar(data?.actions);
    const token = nilaiAction(actions, ['QR_STRING', 'VIRTUAL_ACCOUNT_NUMBER']);
    const redirectUrl = urlRedirect(actions);
    const expires = tanggal(objek(data?.channel_properties)?.expires_at) ?? i.kedaluwarsaPada;

    let instruksi: InstruksiPembayaran | null = null;
    if (kanal.grup === 'qris' && token) {
      instruksi = { jenis: 'qr', nilai: token, kedaluwarsaPada: expires };
    } else if (kanal.grup === 'va' && token) {
      instruksi = { jenis: 'va', nomor: token, bank: kanal.bank ?? kanal.label, kedaluwarsaPada: expires };
    } else if (kanal.grup === 'ewallet' && redirectUrl) {
      instruksi = { jenis: 'redirect', url: redirectUrl, kedaluwarsaPada: expires };
    }
    if (!instruksi) throw new Error(`Xendit payment request ${metode} tanpa instruksi pembayaran`);

    return {
      orderId: i.orderId,
      token,
      redirectUrl,
      kedaluwarsaPada: expires,
      providerRef: id,
      metode: teks(data?.channel_code) ?? metode,
      instruksi,
    };
  };

  const refundV3 = async (orderId: string, nominal: number, providerRef: string): Promise<HasilRefundGateway> => {
    // Refunds v3 wajib payment_id, bukan payment_request_id. Ambil dari detail PR.
    const detail = await permintaan(`/v3/payment_requests/${encodeURIComponent(providerRef)}`, { method: 'GET' });
    if (!detail.ok) return { ok: false, kode: 'REFUND_DITOLAK' };
    const d = await ambilJson(detail);
    const latest = objek(d?.latest_payment);
    const paymentId = teks(d?.latest_payment_id) ?? (latest ? teks(latest.payment_id) : null);
    if (!paymentId) return { ok: false, kode: 'TANPA_PAYMENT' };

    const res = await permintaan('/v3/refunds', {
      method: 'POST',
      body: JSON.stringify({
        reference_id: orderId,
        payment_id: paymentId,
        amount: nominal,
        // Xendit hanya menerima enum untuk reason; teks bebas ditolak 400.
        // Alasan detail tetap disimpan di catatan refund internal.
        reason: ALASAN_REFUND,
      }),
    });
    if (!res.ok) return { ok: false, kode: 'REFUND_DITOLAK' };

    const data = await ambilJson(res);
    const id = teks(data?.refund_id) ?? teks(data?.id);
    const status = teks(data?.status)?.toLowerCase();
    if (status === 'failed') return { ok: false, kode: 'REFUND_DITOLAK' };
    if (!id) return { ok: false, kode: 'REFUND_TANPA_ID' };
    return { ok: true, reference: id };
  };

  return {
    nama: 'xendit',

    async buatTransaksi(i: BuatTransaksiInput): Promise<TransaksiGateway> {
      return i.metode ? buatPaymentRequest(i) : buatInvoiceV2(i);
    },

    async bacaNotifikasi(req: Request): Promise<NotifikasiGateway | null> {
      const diharapkan = tokenCallback();
      const diterima = req.headers.get('x-callback-token');
      if (!diharapkan || !diterima || !samakanAmanWaktu(diterima, diharapkan)) return null;

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return null;
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
      const b = body as Record<string, unknown>;

      // Payment/Refund webhook v3: { event, data }.
      const event = teks(b.event);
      if (event) {
        const d = dataDari(b);
        if (event.toLowerCase().startsWith('payment.')) return notifikasiPembayaranV3(event, d);
        if (event.toLowerCase().startsWith('refund.')) return notifikasiRefundV3(event, d);
      }

      // Sebagian notifikasi PR dikirim datar tanpa `event`.
      if (teks(b.payment_request_id) && teks(b.status) && !teks(b.external_id)) {
        return notifikasiPaymentRequest(b);
      }

      // Callback refund invoice v2 hanya membawa invoice_id (tanpa external_id).
      const invoiceId = teks(b.invoice_id);
      if (invoiceId) {
        const id = teks(b.id) ?? invoiceId;
        const statusMentah = teks(b.status);
        if (!statusMentah) return null;
        const refund = petakanStatusRefundXendit(statusMentah);
        return {
          eventKey: `xendit:refund:${id}:${statusMentah.toLowerCase()}`,
          orderId: '', // diresolusi store lewat providerRef
          providerRef: invoiceId,
          tipe: 'refund',
          // Status selain sukses/pending sengaja `pending`: store mengabaikannya karena
          // pembayaran sudah lunas, tetapi event tetap tercatat untuk audit.
          status: refund === 'refund' ? 'refund' : 'pending',
          metode: null,
          jumlah: angka(b.amount),
          waktuBayar: tanggal(b.created) ?? tanggal(b.updated),
          payload: b,
        };
      }

      return notifikasiInvoice(b);
    },

    async ambilStatus(orderId: string, providerRef?: string | null): Promise<NotifikasiGateway | null> {
      if (providerRef?.startsWith('pr-')) {
        const res = await permintaan(`/v3/payment_requests/${encodeURIComponent(providerRef)}`, { method: 'GET' });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Xendit status gagal (HTTP ${res.status})`);
        const data = await ambilJson(res);
        return data ? notifikasiPaymentRequest(data, orderId) : null;
      }

      if (providerRef) {
        const res = await permintaan(`/v2/invoices/${encodeURIComponent(providerRef)}`, { method: 'GET' });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Xendit status gagal (HTTP ${res.status})`);
        const data = await ambilJson(res);
        return data ? notifikasiInvoice(data, orderId) : null;
      }

      // Tanpa provider_ref: cari invoice lewat external_id (= orderId internal).
      const res = await permintaan(`/v2/invoices?external_id=${encodeURIComponent(orderId)}&limit=1`, { method: 'GET' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Xendit status gagal (HTTP ${res.status})`);
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        return null;
      }
      const daftarInvoice = Array.isArray(data)
        ? data
        : (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : []);
      const pertama = daftarInvoice[0];
      return pertama && typeof pertama === 'object' && !Array.isArray(pertama)
        ? notifikasiInvoice(pertama as Record<string, unknown>, orderId)
        : null;
    },

    async refund(orderId: string, nominal: number, _alasan: string, providerRef?: string | null): Promise<HasilRefundGateway> {
      if (!providerRef) return { ok: false, kode: 'TANPA_REFERENCE' };
      if (providerRef.startsWith('pr-')) return refundV3(orderId, nominal, providerRef);

      const res = await permintaan('/refunds', {
        method: 'POST',
        headers: { 'api-version': API_VERSION },
        body: JSON.stringify({
          invoice_id: providerRef,
          amount: nominal,
          reason: ALASAN_REFUND,
        }),
      });

      if (!res.ok) return { ok: false, kode: 'REFUND_DITOLAK' };
      const data = await ambilJson(res);
      const id = teks(data?.id);
      const status = teks(data?.status)?.toLowerCase();
      if (status === 'failed') return { ok: false, kode: 'REFUND_DITOLAK' };
      if (!id) return { ok: false, kode: 'REFUND_TANPA_ID' };
      return { ok: true, reference: id };
    },

    async batalkan(providerRef: string): Promise<void> {
      // Best effort: kegagalan cancel tidak boleh menghalangi pembuatan metode baru.
      try {
        if (providerRef.startsWith('pr-')) {
          await permintaan(`/v3/payment_requests/${encodeURIComponent(providerRef)}/cancel`, { method: 'POST' });
        } else {
          await permintaan(`/v2/invoices/${encodeURIComponent(providerRef)}/expire`, { method: 'POST' });
        }
      } catch {
        // transaksi lama tetap ditutup di DB oleh service
      }
    },

    /**
     * [Hanya test mode] Endpoint simulasi resmi Xendit (docs: "Simulate payment [test mode]").
     * Dipagari tiga lapis: bukan production, kunci development, dan transaksi v3 (`pr-…`).
     * Respons 200 berarti simulasi sedang diproses di sisi Xendit; status akhir dibaca
     * ulang lewat ambilStatus (poller sinkron) atau webhook payment.capture.
     */
    async simulasikanPembayaran(_orderId: string, providerRef: string, jumlah: number) {
      if (process.env.NODE_ENV === 'production') return { ok: false as const, kode: 'HANYA_TEST' };
      if (!kunci().startsWith('xnd_development_')) return { ok: false as const, kode: 'HANYA_TEST' };
      if (!providerRef.startsWith('pr-')) return { ok: false as const, kode: 'BUKAN_PAYMENT_REQUEST' };

      const res = await permintaan(`/v3/payment_requests/${encodeURIComponent(providerRef)}/simulate`, {
        method: 'POST',
        body: JSON.stringify({ amount: jumlah }),
      });
      if (res.status === 404) return { ok: false as const, kode: 'TIDAK_DITEMUKAN' };
      if (!res.ok) return { ok: false as const, kode: 'GATEWAY_GAGAL' };
      return { ok: true as const };
    },
  };
}

export const xenditGateway: GatewayProvider = buatXenditGateway();
