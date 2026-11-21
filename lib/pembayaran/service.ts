import { randomBytes } from 'node:crypto';
import { validasiBerkas } from '../berkas.ts';
import type { StatusPesanan } from '../slots.ts';

export type PesananBayar = { id: number; kode: string; penggunaId: number; status: StatusPesanan; batasBayarPada: Date };

export interface PembayaranStore {
  /** Hanya pesanan milik `penggunaId`; pesanan orang lain sama dengan tidak ada. */
  cariPesananMilik(kode: string, penggunaId: number): Promise<PesananBayar | null>;
  /** Satu transaksi: Pembayaran + status → menunggu_verifikasi + RiwayatStatus. false bila status sudah bukan menunggu_pembayaran. */
  catatBukti(d: { pesananId: number; penggunaId: number; kunci: string; tipe: string; ukuran: number; now: Date }): Promise<boolean>;
  /** Satu transaksi: status → dibatalkan + slot dilepas + RiwayatStatus. false bila status sudah bukan menunggu_pembayaran. */
  batalkan(d: { pesananId: number; penggunaId: number; now: Date }): Promise<boolean>;
}
export interface Storage {
  simpan(kunci: string, isi: Uint8Array, tipe: string): Promise<void>;
  hapus(kunci: string): Promise<void>;
}
export type PembayaranDeps = { store: PembayaranStore; storage: Storage; sekarang: () => Date };

type Galat = 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH';
export type HasilUnggah = { ok: true } | { ok: false; kode: Galat | 'KEDALUWARSA' | 'KOSONG' | 'TERLALU_BESAR' | 'TIPE_TIDAK_DIDUKUNG' };

export async function unggahBukti(d: PembayaranDeps, i: { penggunaId: number; kode: string; isi: Uint8Array }): Promise<HasilUnggah> {
  const now = d.sekarang();
  const p = await d.store.cariPesananMilik(i.kode, i.penggunaId);
  if (!p) return { ok: false, kode: 'TIDAK_DITEMUKAN' };
  if (p.status !== 'menunggu_pembayaran') return { ok: false, kode: 'STATUS_BERUBAH' }; // satu bukti per pesanan; yang ditolak final (BR-11)
  if (p.batasBayarPada <= now) return { ok: false, kode: 'KEDALUWARSA' }; // jangan menunggu penjadwal (BR-07)

  const v = validasiBerkas(i.isi);
  if (!v.ok) return { ok: false, kode: v.kode };

  const kunci = `bukti/${p.id}/${randomBytes(16).toString('hex')}.${v.ekstensi}`;
  await d.storage.simpan(kunci, i.isi, v.tipe);
  const bersihkan = () => d.storage.hapus(kunci).catch((e) => console.error('[pembayaran] gagal membersihkan berkas yatim', kunci, e));
  try {
    const berhasil = await d.store.catatBukti({ pesananId: p.id, penggunaId: i.penggunaId, kunci, tipe: v.tipe, ukuran: i.isi.length, now });
    if (!berhasil) { await bersihkan(); return { ok: false, kode: 'STATUS_BERUBAH' }; }
  } catch (e) {
    await bersihkan();
    throw e;
  }
  return { ok: true };
}

export async function batalkanPesanan(d: PembayaranDeps, i: { penggunaId: number; kode: string }): Promise<{ ok: true } | { ok: false; kode: Galat }> {
  const p = await d.store.cariPesananMilik(i.kode, i.penggunaId);
  if (!p) return { ok: false, kode: 'TIDAK_DITEMUKAN' };
  if (p.status !== 'menunggu_pembayaran') return { ok: false, kode: 'STATUS_BERUBAH' }; // sesudah bayar: lewat form pengajuan (BR-12)
  const berhasil = await d.store.batalkan({ pesananId: p.id, penggunaId: i.penggunaId, now: d.sekarang() });
  return berhasil ? { ok: true } : { ok: false, kode: 'STATUS_BERUBAH' };
}
