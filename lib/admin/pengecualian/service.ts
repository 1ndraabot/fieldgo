import { DEMO } from '../../demo.ts';
import { prosesNotifikasi, type GatewayStore, type HasilNotifikasi } from '../../gateway/service.ts';
import type { GatewayProvider } from '../../gateway/types.ts';
import {
  bolehTerima, validasiPutusanBatal, validasiRefundBaru, validasiSelesaikan, validasiTinjau,
  type AksiBatal, type AksiTinjau, type CaraRefund,
} from './rules.ts';

export type KodeGagalPengecualian =
  | 'MODE_DEMO' | 'TIDAK_DITEMUKAN' | 'VALIDASI' | 'STATUS_BERUBAH' | 'SLOT_TERPAKAI'
  | 'SUDAH_ADA_REFUND' | 'GATEWAY_GAGAL' | 'GATEWAY_TIDAK_TERJANGKAU' | 'BELUM_ADA_INFO';

export type HasilPengecualian<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; kode: KodeGagalPengecualian; pesan: string };

const gagal = <T>(kode: KodeGagalPengecualian, pesan: string): HasilPengecualian<T> =>
  ({ ok: false, kode, pesan });

/** Klaim refund yang sudah dibuat store: satu refund per transaksi tertagih. */
export type KlaimRefund = { refundId: number; orderId: string | null; jumlah: number; adaTagihan: boolean };

export type PengecualianDeps = {
  store: PengecualianStore;
  /** Store gateway untuk memproses hasil sinkronisasi lewat jalur webhook yang sama. */
  gatewayStore: GatewayStore;
  gateway: GatewayProvider;
  sekarang: () => Date;
};

export type PesananUntukTinjau = { id: number; kode: string; status: string; totalHarga: number };

export type PembayaranUntukTinjau = {
  id: number;
  orderId: string;
  provider: string;
  /** 'perlu_tinjau' bila uang sudah masuk tetapi perlu keputusan admin. */
  status: string;
  jumlah: number;
  /** Kode alasan tinjau: BAYAR_TERLAMBAT, NOMINAL_TIDAK_COCOK, dst. */
  alasan: string | null;
};

export interface PengecualianStore {
  pesananDenganSlot(kode: string): Promise<PesananUntukTinjau | null>;
  /** Pembayaran bermasalah terbaru milik pesanan (perlu_tinjau), atau null. */
  pembayaranTinjau(pesananId: number): Promise<PembayaranUntukTinjau | null>;
  /** Percobaan transaksi terakhir pesanan (untuk tarik status gateway). */
  transaksiTerakhir(kode: string): Promise<{ orderId: string } | null>;
  /** Transaksi tertagih terbaru (dibayar / perlu_tinjau) untuk refund. */
  pembayaranTertagih(kode: string): Promise<{ id: number; orderId: string; jumlah: number } | null>;
  /**
   * Terima pembayaran telat: pesanan → Terkonfirmasi + slot dikunci ulang, semua dalam satu
   * transaksi dengan pemeriksaan status dan bentrok slot. Slot dipakai orang lain = SLOT_TERPAKAI.
   */
  terimaPembayaran(d: { pesananId: number; pembayaranId: number; adminId: number; catatan: string; now: Date }):
    Promise<'ok' | 'STATUS_BERUBAH' | 'SLOT_TERPAKAI'>;
  /** Buat baris refund untuk pembayaran bermasalah (belum ada refund aktif). Pesanan dibatalkan bila masih menunggu. */
  klaimRefundPembayaran(d: { pesananId: number; nominal: number; alasan: string; catatan: string; adminId: number; now: Date }):
    Promise<KlaimRefund | 'TIDAK_DITEMUKAN' | 'SUDAH_ADA_REFUND'>;
  /** Refund langsung dari admin (tanpa antrean pengecualian). */
  buatRefundBaru(d: { kode: string; nominal: number; alasan: string; cara: CaraRefund; catatan: string | null; adminId: number; now: Date }):
    Promise<KlaimRefund | 'TIDAK_DITEMUKAN'>;
  /** Setujui pengajuan batal: pesanan dibatalkan, slot dilepas, refund dibuat (gateway bila ada tagihan). */
  putuskanBatalSetujui(d: { kode: string; catatan: string; nominalRefund: number | null; adminId: number; now: Date }):
    Promise<KlaimRefund | 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH'>;
  /** Tolak pengajuan: pesanan kembali Terkonfirmasi, slot tetap terisi. */
  putuskanBatalTolak(d: { kode: string; catatan: string; adminId: number; now: Date }):
    Promise<'ok' | 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH'>;
  /** Tandai refund manual selesai (admin sudah transfer). */
  selesaikanRefund(d: { kode: string; refundId: number; catatan: string; adminId: number; now: Date }):
    Promise<'ok' | 'TIDAK_DITEMUKAN'>;
  /** Hasil panggilan API refund gateway: sukses → diproses + transaksi refund; gagal → gagal + manual. */
  perbaruiRefundGateway(d: { refundId: number; berhasil: boolean; reference: string | null; catatan: string; now: Date }): Promise<void>;
}

/** Selesaikan klaim refund lewat API gateway; bila gagal, refund jatuh ke jalur manual. */
async function selesaikanViaGateway(d: PengecualianDeps, klaim: KlaimRefund, now: Date): Promise<HasilPengecualian<{ id: number }>> {
  if (!klaim.adaTagihan || !klaim.orderId) {
    // Tanpa transaksi gateway (pesanan lama/manual): refund menunggu transfer manual admin.
    return { ok: true, data: { id: klaim.refundId } };
  }
  try {
    const r = await d.gateway.refund(klaim.orderId, klaim.jumlah, 'Refund pesanan FieldGo');
    if (r.ok) {
      await d.store.perbaruiRefundGateway({ refundId: klaim.refundId, berhasil: true, reference: r.reference, catatan: '', now });
      return { ok: true, data: { id: klaim.refundId } };
    }
    await d.store.perbaruiRefundGateway({
      refundId: klaim.refundId, berhasil: false, reference: null,
      catatan: `Refund gateway gagal (${r.kode}); selesaikan lewat transfer manual.`, now,
    });
    return gagal('GATEWAY_GAGAL', 'Refund via gateway gagal. Transfer manual lalu tandai selesai di tab Refund.');
  } catch {
    await d.store.perbaruiRefundGateway({
      refundId: klaim.refundId, berhasil: false, reference: null,
      catatan: 'Gateway tidak terjangkau; selesaikan lewat transfer manual.', now,
    });
    return gagal('GATEWAY_TIDAK_TERJANGKAU', 'Gateway tidak terjangkau. Transfer manual lalu tandai selesai di tab Refund.');
  }
}

const CATATAN_TERIMA = 'Pembayaran diterima admin meski lewat batas; slot masih bebas.';

/**
 * Keputusan admin atas pembayaran bermasalah (FR-ADM-06):
 * - terima  : hanya BAYAR_TERLAMBAT/STATUS berubah, slot diperiksa ulang di transaksi.
 * - refund  : uang dikembalikan lewat gateway; pesanan dibatalkan bila masih menunggu.
 */
export async function tinjauPembayaran(
  d: PengecualianDeps,
  i: { kode: string; aksi: AksiTinjau; catatan: string; adminId: number },
): Promise<HasilPengecualian<{ id?: number }>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: keputusan pembayaran tidak dapat disimpan.');
  const galat = validasiTinjau(i.aksi, i.catatan);
  if (galat) return gagal('VALIDASI', galat);

  const p = await d.store.pesananDenganSlot(i.kode);
  if (!p) return gagal('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.');
  const pb = await d.store.pembayaranTinjau(p.id);
  if (!pb) return gagal('TIDAK_DITEMUKAN', 'Tidak ada pembayaran yang perlu ditinjau untuk pesanan ini.');
  const now = d.sekarang();

  if (i.aksi === 'terima') {
    if (!bolehTerima(pb.alasan)) {
      return gagal('VALIDASI', 'Pembayaran dengan nominal tidak cocok atau perlu tinjau provider hanya dapat di-refund.');
    }
    const r = await d.store.terimaPembayaran({
      pesananId: p.id, pembayaranId: pb.id, adminId: i.adminId,
      catatan: i.catatan ? `${CATATAN_TERIMA} Catatan: ${i.catatan}` : CATATAN_TERIMA, now,
    });
    if (r === 'SLOT_TERPAKAI') return gagal('SLOT_TERPAKAI', 'Slot sudah dipesan orang lain. Lakukan refund penuh.');
    if (r === 'STATUS_BERUBAH') return gagal('STATUS_BERUBAH', 'Status pesanan sudah berubah; muat ulang halaman.');
    return { ok: true, data: {} };
  }

  const klaim = await d.store.klaimRefundPembayaran({
    pesananId: p.id, nominal: pb.jumlah, alasan: i.catatan, catatan: i.catatan, adminId: i.adminId, now,
  });
  if (klaim === 'SUDAH_ADA_REFUND') return gagal('SUDAH_ADA_REFUND', 'Refund untuk pembayaran ini sudah dibuat.');
  if (klaim === 'TIDAK_DITEMUKAN') return gagal('TIDAK_DITEMUKAN', 'Tidak ada pembayaran yang perlu ditinjau.');
  return selesaikanViaGateway(d, klaim, now);
}

/** Tarik status transaksi terakhir dari gateway lalu proses seperti webhook (idempoten). */
export async function sinkronkan(d: PengecualianDeps, kode: string): Promise<HasilPengecualian<HasilNotifikasi>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: sinkronisasi tidak tersedia.');

  const t = await d.store.transaksiTerakhir(kode);
  if (!t) return gagal('TIDAK_DITEMUKAN', 'Pesanan ini belum memiliki transaksi gateway.');

  let notif;
  try {
    notif = await d.gateway.ambilStatus(t.orderId);
  } catch {
    return gagal('GATEWAY_TIDAK_TERJANGKAU', 'Gateway tidak terjangkau. Coba lagi sebentar.');
  }
  if (!notif) return gagal('BELUM_ADA_INFO', 'Gateway belum memberi status untuk transaksi ini. Coba lagi nanti.');

  const hasil = await prosesNotifikasi(
    { store: d.gatewayStore, gateway: d.gateway, sekarang: d.sekarang, baseUrl: '' },
    notif,
  );
  return { ok: true, data: hasil };
}

/** Putuskan pengajuan pembatalan penyewa (FR-ADM-07, BR-13): setujui → refund, tolak → kembali Terkonfirmasi. */
export async function putuskanPembatalan(
  d: PengecualianDeps,
  i: { kode: string; aksi: AksiBatal; catatan: string; nominalRefund: number | null; adminId: number },
): Promise<HasilPengecualian<{ refundId?: number }>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: putusan pembatalan tidak dapat disimpan.');
  const galat = validasiPutusanBatal(i.aksi, i.catatan, i.nominalRefund);
  if (galat) return gagal('VALIDASI', galat);

  const now = d.sekarang();
  if (i.aksi === 'tolak') {
    const r = await d.store.putuskanBatalTolak({ kode: i.kode, catatan: i.catatan, adminId: i.adminId, now });
    if (r === 'TIDAK_DITEMUKAN') return gagal('TIDAK_DITEMUKAN', 'Pengajuan pembatalan tidak ditemukan atau sudah diputuskan.');
    if (r === 'STATUS_BERUBAH') return gagal('STATUS_BERUBAH', 'Status pesanan sudah berubah; muat ulang halaman.');
    return { ok: true, data: {} };
  }

  const klaim = await d.store.putuskanBatalSetujui({
    kode: i.kode, catatan: i.catatan, nominalRefund: i.nominalRefund, adminId: i.adminId, now,
  });
  if (klaim === 'TIDAK_DITEMUKAN') return gagal('TIDAK_DITEMUKAN', 'Pengajuan pembatalan tidak ditemukan atau sudah diputuskan.');
  if (klaim === 'STATUS_BERUBAH') return gagal('STATUS_BERUBAH', 'Status pesanan sudah berubah; muat ulang halaman.');
  const hasil = await selesaikanViaGateway(d, klaim, now);
  if (hasil.ok) return { ok: true, data: { refundId: klaim.refundId } };
  return hasil;
}

/** Refund baru yang dibuat admin (mis. slot sudah dipakai setelah penolakan terima). */
export async function buatRefund(
  d: PengecualianDeps,
  i: { kode: string; nominal: number; alasan: string; cara: CaraRefund; catatan: string | null; adminId: number },
): Promise<HasilPengecualian<{ id: number }>> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: refund tidak dapat dibuat.');
  const galat = validasiRefundBaru(i.cara, i.nominal, i.alasan);
  if (galat) return gagal('VALIDASI', galat);

  const tagihan = i.cara === 'gateway' ? await d.store.pembayaranTertagih(i.kode) : null;
  if (i.cara === 'gateway' && !tagihan) {
    return gagal('VALIDASI', 'Tidak ada pembayaran gateway tertagih untuk pesanan ini; gunakan cara manual.');
  }

  const klaim = await d.store.buatRefundBaru({
    kode: i.kode, nominal: i.nominal, alasan: i.alasan, cara: i.cara,
    catatan: i.catatan, adminId: i.adminId, now: d.sekarang(),
  });
  if (klaim === 'TIDAK_DITEMUKAN') return gagal('TIDAK_DITEMUKAN', 'Pesanan tidak ditemukan.');
  if (i.cara === 'manual') return { ok: true, data: { id: klaim.refundId } }; // menunggu transfer manual
  return selesaikanViaGateway(d, klaim, d.sekarang());
}

/** Tandai refund (menunggu/gagal) sebagai selesai — admin sudah transfer manual (FR-ADM-07). */
export async function selesaikanRefundManual(
  d: PengecualianDeps,
  i: { kode: string; refundId: number; catatan: string; adminId: number },
): Promise<HasilPengecualian> {
  if (DEMO) return gagal('MODE_DEMO', 'Mode demo tanpa basis data: refund tidak dapat ditandai selesai.');
  const galat = validasiSelesaikan(i.catatan);
  if (galat) return gagal('VALIDASI', galat);

  const r = await d.store.selesaikanRefund({
    kode: i.kode, refundId: i.refundId, catatan: i.catatan, adminId: i.adminId, now: d.sekarang(),
  });
  if (r === 'TIDAK_DITEMUKAN') return gagal('TIDAK_DITEMUKAN', 'Refund tidak ditemukan atau sudah selesai.');
  return { ok: true, data: undefined };
}
