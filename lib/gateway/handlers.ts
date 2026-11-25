import { bacaCookie, NAMA_COOKIE } from '../auth/cookie.ts';
import type { Limiter } from '../auth/ratelimit.ts';
import { ambilPengguna, type AuthDeps } from '../auth/service.ts';
import { DEMO } from '../demo.ts';
import { statusTampil } from '../riwayat/rules.ts';
import { galatServer, json } from '../admin/http.ts';
import { simulasiTestAktif } from './rules.ts';
import { buatTransaksi, prosesNotifikasi, sinkronkanMilik, type GatewayDeps } from './service.ts';

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
  METODE_TIDAK_VALID: 400,
  VALIDASI: 400,
  GATEWAY_GAGAL: 502,
  GATEWAY_NONAKTIF: 503,
  BELUM_ADA_TAGIHAN: 409,
  TIDAK_DIDUKUNG: 400,
  HANYA_TEST: 403,
  BUKAN_PAYMENT_REQUEST: 400,
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

        // Body opsional: { metode: "QRIS" }. Kosong = alur invoice v2 lama.
        let body: Record<string, unknown> = {};
        const mentah = await req.text();
        if (mentah.trim()) {
          try {
            const v: unknown = JSON.parse(mentah);
            if (!v || typeof v !== 'object' || Array.isArray(v)) return json(400, { ok: false, kode: 'VALIDASI' });
            body = v as Record<string, unknown>;
          } catch {
            return json(400, { ok: false, kode: 'VALIDASI' });
          }
        }
        const metode = typeof body.metode === 'string' ? body.metode.trim() : null;

        const r = await buatTransaksi(d, { penggunaId: p.id, kode, metode });
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

    /** POST /api/pesanan/[kode]/sinkron — tarik status gateway untuk pesanan milik sesi ini. */
    sinkron: async (req: Request, kode: string) => {
      try {
        if (DEMO) return json(503, { ok: false, kode: 'MODE_DEMO' });
        if (!jsonWajib(req)) return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' });
        const p = await penggunaDari(req);
        if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
        if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

        const r = await sinkronkanMilik(d, kode, p.id);
        if (!r.ok) {
          const status = r.kode === 'TIDAK_DITEMUKAN' ? 404
            : r.kode === 'DIBATASI' ? 429
            : r.kode === 'BELUM_ADA_INFO' ? 409
            : 502;
          return json(status, { ok: false, kode: r.kode, ...(r.ulangiDetik === undefined ? {} : { ulangiDetik: r.ulangiDetik }) });
        }

        return json(200, {
          ok: true,
          status: statusTampil(r.status, r.batasBayarPada, d.sekarang()),
          statusBayar: r.transaksi?.status ?? null,
          dibayarPada: r.transaksi?.dibayarPada?.toISOString() ?? null,
          hasil: r.hasil,
        });
      } catch (e) {
        return galatServer('gateway', e);
      }
    },

    /**
     * POST /api/pesanan/[kode]/simulasi-test — [hanya pengembangan] selesaikan tagihan
     * test mode Xendit lewat endpoint simulasi resmi. Status akhir tidak dikira-kira di
     * sini: poller sinkron/webhook yang membaca ulang dari provider (idempoten).
     */
    simulasiTest: async (req: Request, kode: string) => {
      try {
        // Di produksi endpoint ini seolah tidak ada, kecuali saklar demo dinyalakan
        // (GATEWAY_SIMULASI_TEST="true" dengan kunci test Xendit).
        if (!simulasiTestAktif({
          provider: d.gateway.nama,
          secretKey: process.env.XENDIT_SECRET_KEY,
          nodeEnv: process.env.NODE_ENV,
          izinFlag: process.env.GATEWAY_SIMULASI_TEST,
        })) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
        if (DEMO) return json(503, { ok: false, kode: 'MODE_DEMO' });
        if (!jsonWajib(req)) return json(415, { ok: false, kode: 'MEDIA_TIDAK_DIDUKUNG' });
        const p = await penggunaDari(req);
        if (!p) return json(401, { ok: false, kode: 'TIDAK_LOGIN' });
        if (!KODE.test(kode)) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });

        const pesanan = await d.store.cariPesananMilik(kode, p.id);
        if (!pesanan) return json(404, { ok: false, kode: 'TIDAK_DITEMUKAN' });
        if (pesanan.status !== 'menunggu_pembayaran') return json(409, { ok: false, kode: 'STATUS_BERUBAH' });
        if (pesanan.batasBayarPada.getTime() <= d.sekarang().getTime()) return json(410, { ok: false, kode: 'KEDALUWARSA' });

        const t = await d.store.transaksiAktif(pesanan.id, d.sekarang());
        if (!t || t.status !== 'pending' || !t.providerRef) return json(409, { ok: false, kode: 'BELUM_ADA_TAGIHAN' });
        if (!d.gateway.simulasikanPembayaran) return json(400, { ok: false, kode: 'TIDAK_DIDUKUNG' });

        const r = await d.gateway.simulasikanPembayaran(t.orderId, t.providerRef, pesanan.totalHarga);
        return r.ok
          ? json(200, { ok: true, kode: 'SIMULASI_TERKIRIM' })
          : json(STATUS[r.kode] ?? 400, { ok: false, kode: r.kode });
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
