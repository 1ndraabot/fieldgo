import { bacaCookie, NAMA_COOKIE } from '../auth/cookie.ts';
import type { Limiter } from '../auth/ratelimit.ts';
import { ambilPengguna, type AuthDeps } from '../auth/service.ts';
import { DEMO } from '../demo.ts';
import { statusTampil } from '../riwayat/rules.ts';
import { galatServer, json } from '../admin/http.ts';
import { buatTransaksi, prosesNotifikasi, type GatewayDeps } from './service.ts';

export type GatewayHandlerDeps = GatewayDeps & {
  auth: AuthDeps;
  limiter: Limiter;
  gatewayAktif: () => Promise<boolean>;
};

const KODE = /^[A-Za-z0-9-]{4,40}$/;
const STATUS: Record<string, number> = {
  TIDAK_DITEMUKAN: 404,
  STATUS_BERUBAH: 409,
  KEDALUWARSA: 410,
  BATAS_PERCOBAAN: 409,
  GATEWAY_GAGAL: 502,
  GATEWAY_NONAKTIF: 503,
};

export function buatHandlersGateway(d: GatewayHandlerDeps) {
  const penggunaDari = (req: Request) => ambilPengguna(d.auth, bacaCookie(req.headers.get('cookie'), NAMA_COOKIE));
  const jsonWajib = (req: Request) =>
    (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');

  return {
    /** POST /api/pesanan/[kode]/bayar — membuat/mengulang transaksi gateway milik sesi. */
    bayar: async (req: Request, kode: string) => {
      try {
        if (DEMO) return json(503, { ok: false, kode: 'MODE_DEMO' }); // tanpa database: hanya halaman baca
        if (!jsonWajib(req)) return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' });
        const p = await penggunaDari(req);
        if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
        if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

        const batas = d.limiter.cek(`bayar:${p.id}`);
        if (!batas.diizinkan) return json(429, { ok: false, kode: 'DIBATASI', ulangiDetik: batas.ulangiDetik });

        if (!(await d.gatewayAktif())) return json(503, { ok: false, kode: 'GATEWAY_NONAKTIF' });

        const r = await buatTransaksi(d, { penggunaId: p.id, kode });
        return r.ok
          ? json(200, { ok: true, ...r.transaksi })
          : json(STATUS[r.kode] ?? 400, { ok: false, kode: r.kode });
      } catch (e) {
        return galatServer('gateway', e);
      }
    },

    /** GET /api/pesanan/[kode]/status — polling halaman pembayaran (hanya pemilik). */
    status: async (req: Request, kode: string) => {
      try {
        if (DEMO) return json(200, { ok: true, status: 'menunggu_pembayaran', statusBayar: null, dibayarPada: null });
        const p = await penggunaDari(req);
        if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
        if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

        const r = await d.store.statusPesanan(kode, p.id);
        if (!r) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

        return json(200, {
          ok: true,
          status: statusTampil(r.status, r.batasBayarPada, d.sekarang()),
          statusBayar: r.transaksi?.status ?? null,
          dibayarPada: r.transaksi?.dibayarPada?.toISOString() ?? null,
        });
      } catch (e) {
        return galatServer('gateway', e);
      }
    },

    /** POST /api/gateway/[provider] — webhook. Signature/validasi dilakukan provider. */
    notifikasi: async (req: Request, provider: string) => {
      try {
        if (DEMO) return json(503, { ok: false, kode: 'MODE_DEMO' });
        if (provider !== d.gateway.nama) return json(404, { ok: false, kode: 'PROVIDER_TIDAK_DIKENAL' });
        const notif = await d.gateway.bacaNotifikasi(req);
        if (!notif) return json(401, { ok: false, kode: 'NOTIFIKASI_TIDAK_VALID' });

        const hasil = await prosesNotifikasi(d, notif);
        if (hasil === 'tidak_ditemukan') console.error('[gateway] notifikasi untuk order tak dikenal', notif.orderId);
        // Selalu 200 setelah notifikasi valid agar provider tidak mengirim ulang tanpa akhir.
        return json(200, { ok: true, hasil });
      } catch (e) {
        // 500 membuat provider mencoba ulang; aman karena proses idempotent.
        return galatServer('gateway', e);
      }
    },
  };
}
