import { kanalDari } from './kanal.ts';
import type { GatewayProvider, NotifikasiGateway, StatusBayar, TransaksiGateway } from './types.ts';

const STATUS_SAH: StatusBayar[] = ['pending', 'dibayar', 'gagal', 'kedaluwarsa', 'refund', 'sebagian_refund', 'perlu_tinjau'];

/** Samakan dengan `pilihGateway()`: tanpa env, non-production memakai fake. */
export const simulasiAktif = (): boolean => {
  if (process.env.NODE_ENV === 'production') return false;
  const nama = (process.env.GATEWAY_PROVIDER ?? 'fake').toLowerCase();
  return nama === 'fake';
};

/**
 * Provider lokal untuk menguji seluruh alur tanpa akun Xendit.
 * Hanya menerima notifikasi bila GATEWAY_PROVIDER=fake dan bukan production.
 */
export const fakeGateway: GatewayProvider = {
  nama: 'fake',

  async buatTransaksi(i): Promise<TransaksiGateway> {
    const kanal = kanalDari(i.metode) ?? kanalDari('QRIS')!;
    const simulasi = `/pesanan/${encodeURIComponent(i.kode)}/bayar/simulasi?order=${encodeURIComponent(i.orderId)}`;
    const token = kanal.grup === 'va'
      ? `8808${String(Date.now()).slice(-10)}`
      : kanal.grup === 'qris'
        ? `FAKE-QR-${i.orderId}`
        : null;

    return {
      orderId: i.orderId,
      token,
      // Halaman simulasi tetap dapat dibuka dari QR/VA saat provider fake aktif.
      redirectUrl: simulasi,
      kedaluwarsaPada: i.kedaluwarsaPada,
      providerRef: null,
      metode: kanal.kode,
      instruksi: kanal.grup === 'qris' && token
        ? { jenis: 'qr', nilai: token, kedaluwarsaPada: i.kedaluwarsaPada }
        : kanal.grup === 'va' && token
          ? { jenis: 'va', nomor: token, bank: kanal.bank ?? kanal.label, kedaluwarsaPada: i.kedaluwarsaPada }
          : { jenis: 'redirect', url: simulasi, kedaluwarsaPada: i.kedaluwarsaPada },
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
