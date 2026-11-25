import type { StatusPesanan } from '../slots.ts';
import { bisaAjukanBatal, validasiAjuan, type AjuanInput, type GalatAjuan } from './rules.ts';

export type PesananAjuan = {
  id: number; penggunaId: number; status: StatusPesanan; tanggal: string;
  /** Sudah pernah ada pengajuan untuk pesanan ini (FR-CAN-04: satu pengajuan per pesanan). */
  sudahDiajukan: boolean;
};

export interface RiwayatStore {
  /** Hanya pesanan milik `penggunaId`; pesanan orang lain sama dengan tidak ada. */
  cariPesananMilik(kode: string, penggunaId: number): Promise<PesananAjuan | null>;
  /** Satu transaksi: PengajuanPembatalan + status → pengajuan_pembatalan + RiwayatStatus. Slot tetap aktif (FR-CAN-03). */
  ajukan(d: {
    pesananId: number; penggunaId: number; namaPemesan: string; kontak: string;
    alasan: string; namaBank: string; nomorRekening: string; atasNama: string; now: Date;
  }): Promise<boolean>;
}

export type RiwayatDeps = {
  store: RiwayatStore;
  sekarang: () => Date;
  /** Batas pembatalan (hari sebelum main) dari Pengaturan; kosong = H-1. */
  batasPembatalanHari?: () => Promise<number>;
};

export type HasilAjuan =
  | { ok: true }
  | { ok: false; kode: 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH' | 'LEWAT_BATAS' | 'SUDAH_DIAJUKAN' }
  | { ok: false; kode: 'VALIDASI'; galat: GalatAjuan };

/** Ajukan pembatalan pesanan Terkonfirmasi (FR-CAN-01…04). Semua syarat diperiksa ulang di server. */
export async function ajukanPembatalan(
  d: RiwayatDeps,
  i: { penggunaId: number; kode: string; namaPemesan: string; kontak: string; ajuan: AjuanInput },
): Promise<HasilAjuan> {
  const p = await d.store.cariPesananMilik(i.kode, i.penggunaId);
  if (!p) return { ok: false, kode: 'TIDAK_DITEMUKAN' };

  // FR-CAN-04: pengajuan yang sudah ada (menunggu atau pernah ditolak) tidak boleh digandakan.
  if (p.status === 'pengajuan_pembatalan' || p.sudahDiajukan) return { ok: false, kode: 'SUDAH_DIAJUKAN' };
  if (p.status !== 'terkonfirmasi') return { ok: false, kode: 'STATUS_BERUBAH' }; // hanya pesanan Terkonfirmasi (BR-12)

  const now = d.sekarang();
  const batasHari = d.batasPembatalanHari ? await d.batasPembatalanHari() : 1;
  if (!bisaAjukanBatal(p.status, p.tanggal, now, batasHari)) return { ok: false, kode: 'LEWAT_BATAS' }; // H-N pukul 23.59 WIB

  const galat = validasiAjuan(i.ajuan);
  if (Object.keys(galat).length) return { ok: false, kode: 'VALIDASI', galat };

  const berhasil = await d.store.ajukan({
    pesananId: p.id, penggunaId: i.penggunaId, namaPemesan: i.namaPemesan, kontak: i.kontak,
    alasan: i.ajuan.alasan.trim(), namaBank: i.ajuan.namaBank.trim(),
    nomorRekening: i.ajuan.nomorRekening.trim(), atasNama: i.ajuan.atasNama.trim(), now,
  });
  return berhasil ? { ok: true } : { ok: false, kode: 'STATUS_BERUBAH' };
}
