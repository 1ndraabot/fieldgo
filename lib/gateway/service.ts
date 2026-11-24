import type { StatusPesanan } from '../slots.ts';
import { instruksiDariTransaksi, metodeDiizinkan } from './kanal.ts';
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
  redirectUrl: string | null;
  status: StatusBayar;
  kedaluwarsaPada: Date | null;
  metode: string | null;
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
    redirectUrl: string | null;
    kedaluwarsaPada: Date;
    metode: string | null;
  }): Promise<TransaksiTersimpan>;
  /** Tutup transaksi pending yang ditinggalkan saat penyewa berganti metode. */
  tutupTransaksiPending(orderId: string, now: Date): Promise<void>;
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
  | { ok: false; kode: 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH' | 'KEDALUWARSA' | 'BATAS_PERCOBAAN' | 'METODE_TIDAK_VALID' | 'GATEWAY_GAGAL' };

const MAKS_PERCOBAAN = 10;

function orderIdUntuk(kode: string, percobaan: number): string {
  return percobaan === 0 ? kode : `${kode}-R${percobaan + 1}`;
}

/** Bentuk transaksi untuk UI; instruksi diturunkan dari kolom yang tersimpan (tanpa migrasi). */
function ringkas(t: TransaksiTersimpan, cadanganKedaluwarsa: Date): TransaksiGateway {
  const kedaluwarsaPada = t.kedaluwarsaPada ?? cadanganKedaluwarsa;
  return {
    orderId: t.orderId,
    providerRef: t.providerRef,
    token: t.token,
    redirectUrl: t.redirectUrl,
    kedaluwarsaPada,
    metode: t.metode,
    instruksi: instruksiDariTransaksi({
      metode: t.metode,
      token: t.token,
      redirectUrl: t.redirectUrl,
      kedaluwarsaPada,
    }),
  };
}

/**
 * Membuat transaksi gateway dari data pesanan di server. Nominal dan item tidak pernah
 * berasal dari klien. Transaksi pending dengan metode yang sama dipakai ulang agar klik
 * ganda tidak menagih dua kali; bila penyewa berganti metode, transaksi lama dibatalkan
 * best-effort lalu ditutup sebelum transaksi baru dibuat.
 */
export async function buatTransaksi(
  d: GatewayDeps,
  i: { penggunaId: number; kode: string; metode?: string | null },
): Promise<HasilBuat> {
  const now = d.sekarang();
  const p = await d.store.cariPesananMilik(i.kode, i.penggunaId);
  if (!p) return { ok: false, kode: 'TIDAK_DITEMUKAN' };
  if (p.status !== 'menunggu_pembayaran') return { ok: false, kode: 'STATUS_BERUBAH' };
  if (p.batasBayarPada.getTime() <= now.getTime()) return { ok: false, kode: 'KEDALUWARSA' };

  const diminta = i.metode?.trim() || null;
  const metodeAktif = d.metodeAktif ? await d.metodeAktif() : [];
  if (diminta && !metodeDiizinkan(diminta, metodeAktif)) return { ok: false, kode: 'METODE_TIDAK_VALID' };

  const aktif = await d.store.transaksiAktif(p.id, now);
  if (aktif && (!diminta || aktif.metode === diminta)) {
    return { ok: true, transaksi: ringkas(aktif, p.batasBayarPada) };
  }

  if (aktif) {
    // Ganti metode: instruksi lama tidak boleh tetap bisa dibayar.
    if (aktif.providerRef && d.gateway.batalkan) {
      try {
        await d.gateway.batalkan(aktif.providerRef);
      } catch (e) {
        console.error('[gateway] gagal membatalkan transaksi lama', e);
      }
    }
    await d.store.tutupTransaksiPending(aktif.orderId, now);
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
      metode: diminta ?? undefined,
      metodeAktif,
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
    metode: transaksi.metode,
  });

  // Pakai hasil simpan: pada klik bersamaan, panggilan kedua mendapat transaksi yang sama.
  return { ok: true, transaksi: ringkas(tersimpan, transaksi.kedaluwarsaPada) };
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
  const ringkasStatus = { status: awal.status, batasBayarPada: awal.batasBayarPada, transaksi: t };
  if (awal.status !== 'menunggu_pembayaran' || !t || t.status !== 'pending' || !t.providerRef) {
    return { ok: true, ...ringkasStatus, hasil: null };
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
