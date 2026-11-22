import type { StatusPesanan } from '../slots.ts';
import type { GatewayProvider, NotifikasiGateway, StatusBayar, TransaksiGateway } from './types.ts';

export type PesananGateway = {
  id: number;
  kode: string;
  penggunaId: number;
  status: StatusPesanan;
  totalHarga: number;
  batasBayarPada: Date;
  lapanganNama: string;
  namaPenyewa: string;
  email: string;
  slot: { jam: number; hargaPerJam: number }[];
};

export type TransaksiTersimpan = {
  orderId: string;
  providerRef: string | null;
  token: string | null;
  redirectUrl: string;
  status: StatusBayar;
  kedaluwarsaPada: Date | null;
};

export type HasilNotifikasi =
  | 'ok'
  | 'duplikat'
  | 'tidak_ditemukan'
  | 'review_nominal'
  | 'review_telat'
  | 'review_status'
  | 'perlu_tinjau'
  | 'kedaluwarsa'
  | 'gagal'
  | 'pending'
  | 'refund'
  | 'abaikan';

export type StatusPesananGateway = {
  status: StatusPesanan;
  batasBayarPada: Date;
  transaksi: { orderId: string; providerRef: string | null; status: StatusBayar; dibayarPada: Date | null } | null;
};

export interface GatewayStore {
  cariPesananMilik(kode: string, penggunaId: number): Promise<PesananGateway | null>;
  transaksiAktif(pesananId: number, now: Date): Promise<TransaksiTersimpan | null>;
  hitungPercobaan(pesananId: number): Promise<number>;
  simpanTransaksi(d: {
    pesananId: number;
    provider: string;
    orderId: string;
    providerRef: string | null;
    jumlah: number;
    token: string | null;
    redirectUrl: string;
    kedaluwarsaPada: Date;
  }): Promise<TransaksiTersimpan>;
  statusPesanan(kode: string, penggunaId: number): Promise<StatusPesananGateway | null>;
  prosesNotifikasi(d: NotifikasiGateway & { provider: string; now: Date }): Promise<HasilNotifikasi>;
}

export type GatewayDeps = {
  store: GatewayStore;
  gateway: GatewayProvider;
  sekarang: () => Date;
  baseUrl: string;
  /** Metode pembayaran aktif dari Pengaturan; kosong = semua metode akun gateway. */
  metodeAktif?: () => Promise<string[]>;
  /** Pembatas panggilan sinkron per pesanan (jendela geser di memori proses). */
  throttleSinkron?: (kunci: string) => { diizinkan: boolean; ulangiDetik: number };
};

export type HasilBuat =
  | { ok: true; transaksi: TransaksiGateway }
  | { ok: false; kode: 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH' | 'KEDALUWARSA' | 'BATAS_PERCOBAAN' | 'GATEWAY_GAGAL' };

const MAKS_PERCOBAAN = 5;

function orderIdUntuk(kode: string, percobaan: number): string {
  return percobaan === 0 ? kode : `${kode}-R${percobaan + 1}`;
}

/**
 * Membuat transaksi gateway dari data pesanan di server. Nominal dan item tidak pernah
 * berasal dari klien. Bila masih ada transaksi pending yang berlaku, transaksi itu
 * dipakai ulang agar klik ganda tidak membuat tagihan ganda.
 */
export async function buatTransaksi(d: GatewayDeps, i: { penggunaId: number; kode: string }): Promise<HasilBuat> {
  const now = d.sekarang();
  const p = await d.store.cariPesananMilik(i.kode, i.penggunaId);
  if (!p) return { ok: false, kode: 'TIDAK_DITEMUKAN' };
  if (p.status !== 'menunggu_pembayaran') return { ok: false, kode: 'STATUS_BERUBAH' };
  if (p.batasBayarPada.getTime() <= now.getTime()) return { ok: false, kode: 'KEDALUWARSA' };

  const aktif = await d.store.transaksiAktif(p.id, now);
  if (aktif) {
    return {
      ok: true,
      transaksi: {
        orderId: aktif.orderId,
        providerRef: aktif.providerRef,
        token: aktif.token,
        redirectUrl: aktif.redirectUrl,
        kedaluwarsaPada: aktif.kedaluwarsaPada ?? p.batasBayarPada,
      },
    };
  }

  const percobaan = await d.store.hitungPercobaan(p.id);
  if (percobaan >= MAKS_PERCOBAAN) return { ok: false, kode: 'BATAS_PERCOBAAN' };

  const orderId = orderIdUntuk(p.kode, percobaan);
  let transaksi: TransaksiGateway;
  try {
    transaksi = await d.gateway.buatTransaksi({
      orderId,
      kode: p.kode,
      jumlah: p.totalHarga,
      namaPenyewa: p.namaPenyewa,
      email: p.email,
      itemDetails: p.slot.map((s) => ({
        id: `${orderId}-${s.jam}`,
        nama: `${p.lapanganNama} ${String(s.jam).padStart(2, '0')}.00`,
        harga: s.hargaPerJam,
        jumlah: 1,
      })),
      kedaluwarsaPada: p.batasBayarPada,
      selesaiUrl: `${d.baseUrl}/pesanan/${encodeURIComponent(p.kode)}/bayar`,
      metodeAktif: d.metodeAktif ? await d.metodeAktif() : [],
    });
  } catch (e) {
    console.error('[gateway] gagal membuat transaksi', e);
    return { ok: false, kode: 'GATEWAY_GAGAL' };
  }

  const tersimpan = await d.store.simpanTransaksi({
    pesananId: p.id,
    provider: d.gateway.nama,
    orderId: transaksi.orderId,
    providerRef: transaksi.providerRef,
    jumlah: p.totalHarga,
    token: transaksi.token,
    redirectUrl: transaksi.redirectUrl,
    kedaluwarsaPada: transaksi.kedaluwarsaPada,
  });

  // Pakai hasil simpan: pada klik bersamaan, panggilan kedua mendapat transaksi yang sama.
  return {
    ok: true,
    transaksi: {
      orderId: tersimpan.orderId,
      providerRef: tersimpan.providerRef,
      token: tersimpan.token,
      redirectUrl: tersimpan.redirectUrl,
      kedaluwarsaPada: tersimpan.kedaluwarsaPada ?? transaksi.kedaluwarsaPada,
    },
  };
}

export async function prosesNotifikasi(d: GatewayDeps, notif: NotifikasiGateway): Promise<HasilNotifikasi> {
  return d.store.prosesNotifikasi({ ...notif, provider: d.gateway.nama, now: d.sekarang() });
}

export type HasilSinkron =
  | {
      ok: true;
      status: StatusPesanan;
      batasBayarPada: Date;
      transaksi: { status: StatusBayar; dibayarPada: Date | null } | null;
      /** Hasil pemrosesan notifikasi; null bila tidak ada yang perlu ditarik dari gateway. */
      hasil: HasilNotifikasi | null;
    }
  | {
      ok: false;
      kode: 'TIDAK_DITEMUKAN' | 'DIBATASI' | 'BELUM_ADA_INFO' | 'GATEWAY_TIDAK_TERJANGKAU';
      ulangiDetik?: number;
    };

/**
 * Sinkron otomatis milik penyewa (pengaman bila callback telat/gagal). Hanya menyentuh
 * pesanan milik sesi ini, hanya saat transaksi masih `pending`, dan memakai jalur yang
 * sama dengan webhook (`ambilStatus` → `prosesNotifikasi`, idempoten). Hasil akhirnya
 * tetap dibaca ulang dari basis data, bukan dari tebakan.
 */
export async function sinkronkanMilik(d: GatewayDeps, kode: string, penggunaId: number): Promise<HasilSinkron> {
  const awal = await d.store.statusPesanan(kode, penggunaId);
  if (!awal) return { ok: false, kode: 'TIDAK_DITEMUKAN' };

  const t = awal.transaksi;
  const ringkas = { status: awal.status, batasBayarPada: awal.batasBayarPada, transaksi: t };
  if (awal.status !== 'menunggu_pembayaran' || !t || t.status !== 'pending' || !t.providerRef) {
    return { ok: true, ...ringkas, hasil: null };
  }

  // Batasi panggilan keluar per pesanan: poller 15 detik tetap aman walau tab dibuka ganda.
  const batas = d.throttleSinkron?.(`sinkron:${penggunaId}:${kode}`);
  if (batas && !batas.diizinkan) return { ok: false, kode: 'DIBATASI', ulangiDetik: batas.ulangiDetik };

  let notif: NotifikasiGateway | null;
  try {
    notif = await d.gateway.ambilStatus(t.orderId, t.providerRef);
  } catch (e) {
    console.error('[gateway] sinkron gagal menghubungi provider', e);
    return { ok: false, kode: 'GATEWAY_TIDAK_TERJANGKAU' };
  }
  if (!notif) return { ok: false, kode: 'BELUM_ADA_INFO' };

  const hasil = await prosesNotifikasi(d, notif);
  const sesudah = await d.store.statusPesanan(kode, penggunaId);
  return {
    ok: true,
    status: sesudah?.status ?? awal.status,
    batasBayarPada: sesudah?.batasBayarPada ?? awal.batasBayarPada,
    transaksi: sesudah?.transaksi ?? t,
    hasil,
  };
}
