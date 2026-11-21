import {
  durasiInvoiceDetik, petakanMetodeXendit, petakanStatusRefundXendit, petakanStatusXendit, samakanAmanWaktu,
} from './rules.ts';
import type {
  BuatTransaksiInput, GatewayProvider, HasilRefundGateway, NotifikasiGateway, TransaksiGateway,
} from './types.ts';

const API_BASE = 'https://api.xendit.co';
const REFUND_API_VERSION = '2024-11-11';
const TIMEOUT_MS = 15_000;
/** Enum yang diterima Refunds API; semua refund FieldGo adalah permintaan pengguna/admin. */
const ALASAN_REFUND = 'REQUESTED_BY_CUSTOMER';

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

/**
 * Provider Xendit Invoice API (tanpa SDK).
 * Kredensial dibaca dari environment saat dipanggil agar build tidak bergantung pada .env.
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
    const res = await panggil(`${apiBase}${path}`, {
      ...init,
      headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res;
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

  return {
    nama: 'xendit',

    async buatTransaksi(i: BuatTransaksiInput): Promise<TransaksiGateway> {
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
      };
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

      // Callback refund hanya membawa invoice_id (tanpa external_id).
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
      const daftar = Array.isArray(data)
        ? data
        : (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : []);
      const pertama = daftar[0];
      return pertama && typeof pertama === 'object' && !Array.isArray(pertama)
        ? notifikasiInvoice(pertama as Record<string, unknown>, orderId)
        : null;
    },

    async refund(_orderId: string, nominal: number, _alasan: string, providerRef?: string | null): Promise<HasilRefundGateway> {
      if (!providerRef) return { ok: false, kode: 'TANPA_REFERENCE' };

      const res = await permintaan('/refunds', {
        method: 'POST',
        headers: { 'api-version': REFUND_API_VERSION },
        body: JSON.stringify({
          invoice_id: providerRef,
          amount: nominal,
          // Xendit hanya menerima enum untuk reason; teks bebas ditolak 400.
          // Alasan detail tetap disimpan di catatan refund internal.
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
  };
}

export const xenditGateway: GatewayProvider = buatXenditGateway();
