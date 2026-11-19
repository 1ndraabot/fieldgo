import type { GatewayProvider, NotifikasiGateway, StatusBayar, TransaksiGateway } from './types.ts';

const STATUS_SAH: StatusBayar[] = ['pending', 'dibayar', 'gagal', 'kedaluwarsa', 'refund', 'sebagian_refund', 'perlu_tinjau'];

/** Samakan dengan `pilihGateway()`: tanpa env, non-production memakai fake. */
export const simulasiAktif = (): boolean => {
  if (process.env.NODE_ENV === 'production') return false;
  const nama = (process.env.GATEWAY_PROVIDER ?? 'fake').toLowerCase();
  return nama === 'fake';
};

/**
 * Provider lokal untuk menguji seluruh alur tanpa akun Midtrans.
 * Hanya menerima notifikasi bila GATEWAY_PROVIDER=fake dan bukan production.
 */
export const fakeGateway: GatewayProvider = {
  nama: 'fake',

  async buatTransaksi(i): Promise<TransaksiGateway> {
    const order = encodeURIComponent(i.orderId);
    return {
      orderId: i.orderId,
      token: null,
      redirectUrl: `/pesanan/${encodeURIComponent(i.kode)}/bayar/simulasi?order=${order}`,
      kedaluwarsaPada: i.kedaluwarsaPada,
    };
  },

  async bacaNotifikasi(req: Request): Promise<NotifikasiGateway | null> {
    if (!simulasiAktif()) return null;
    if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return null;

    let body: unknown;
    try { body = await req.json(); } catch { return null; }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

    const b = body as Record<string, unknown>;
    if (typeof b.orderId !== 'string' || !b.orderId.trim()) return null;
    if (typeof b.status !== 'string' || !STATUS_SAH.includes(b.status as StatusBayar)) return null;

    const status = b.status as StatusBayar;
    const jumlah = typeof b.jumlah === 'number' && Number.isInteger(b.jumlah) ? b.jumlah : null;
    const waktuBayar = typeof b.waktuBayar === 'string' && !Number.isNaN(Date.parse(b.waktuBayar))
      ? new Date(b.waktuBayar)
      : null;
    const metode = typeof b.metode === 'string' && b.metode.trim() ? b.metode.trim() : 'simulasi';

    return {
      eventKey: `fake:${b.orderId}:${status}:${jumlah ?? '-'}:${waktuBayar?.toISOString() ?? '-'}`,
      orderId: b.orderId,
      tipe: status === 'refund' || status === 'sebagian_refund' ? 'refund' : 'pembayaran',
      status,
      metode,
      jumlah,
      waktuBayar,
      payload: body,
    };
  },

  async ambilStatus(): Promise<NotifikasiGateway | null> {
    return null;
  },

  async refund() {
    return { ok: true as const, reference: `fake-refund-${Date.now()}` };
  },
};
