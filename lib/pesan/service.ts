import { randomInt } from 'node:crypto';
import { batasBayar, rincianHarga, validasiPesan, type Galat, type JamOperasionalPesan, type PesanInput, type TarifJam } from './rules.ts';

/** Alfabet tanpa karakter ambigu (0/O, 1/I) supaya kode mudah dibacakan (FR-ORD-04). */
const ALFABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const kodePesanan = () => 'FGO-' + Array.from({ length: 6 }, () => ALFABET[randomInt(ALFABET.length)]).join('');

export type LapanganPesan = { id: number; nama: string; aktif: boolean; jamOperasional: JamOperasionalPesan[]; tarif: TarifJam[] };

export type BuatPesanan = {
  kode: string; penggunaId: number; lapanganId: number; tanggal: string; mulai: number; selesai: number;
  jumlahJam: number; totalHarga: number; batasBayarPada: Date; now: Date;
  slot: { jam: number; hargaPerJam: number }[];
};

export interface PesanStore {
  ambilLapangan(id: number): Promise<LapanganPesan | null>;
  /** Jam yang sudah dipegang pesanan aktif pada tanggal itu (menunggu_pembayaran yang lewat batas tidak menghalangi). */
  jamTerpakai(lapanganId: number, tanggal: string, now: Date): Promise<number[]>;
  /** Blokir admin; `jamMulai`/`jamSelesai` kosong berarti sehari penuh. */
  jamDiblokir(lapanganId: number, tanggal: string): Promise<{ jamMulai: number | null; jamSelesai: number | null }[]>;
  /** Satu transaksi atomik: cek ulang slot di bawah kunci, lalu simpan pesanan + slot + riwayat. null = slot sudah diambil. */
  buat(d: BuatPesanan): Promise<{ kode: string } | null>;
}

export type PesanDeps = { store: PesanStore; sekarang: () => Date };

export type HasilPesan =
  | { ok: true; kode: string }
  | { ok: false; kode: 'BELUM_TERVERIFIKASI' }
  | { ok: false; kode: 'VALIDASI'; galat: Galat }
  | { ok: false; kode: 'TIDAK_TERSEDIA' };

/** Buat pesanan: validasi ulang semuanya di server; harga dan batas bayar tidak pernah dari klien (PRD 17.4). */
export async function pesan(d: PesanDeps, i: PesanInput & { penggunaId: number; terverifikasi: boolean }): Promise<HasilPesan> {
  if (!i.terverifikasi) return { ok: false, kode: 'BELUM_TERVERIFIKASI' }; // BR-02

  const now = d.sekarang();
  const lapangan = await d.store.ambilLapangan(i.lapanganId);
  const galat = validasiPesan(i, lapangan, now);
  if (Object.keys(galat).length) return { ok: false, kode: 'VALIDASI', galat };

  const rincian = rincianHarga(lapangan!.tarif, i.tanggal, i.mulai, i.selesai)!;
  const jam = rincian.map((r) => r.jam);
  const [terpakai, blokir] = await Promise.all([
    d.store.jamTerpakai(i.lapanganId, i.tanggal, now),
    d.store.jamDiblokir(i.lapanganId, i.tanggal),
  ]);
  const bentrok = new Set(terpakai);
  for (const b of blokir) {
    for (const j of jam) if (b.jamMulai === null || b.jamSelesai === null || (j >= b.jamMulai && j < b.jamSelesai)) bentrok.add(j);
  }
  if (jam.some((j) => bentrok.has(j))) return { ok: false, kode: 'TIDAK_TERSEDIA' };

  const hasil = await d.store.buat({
    kode: kodePesanan(), penggunaId: i.penggunaId, lapanganId: i.lapanganId, tanggal: i.tanggal,
    mulai: i.mulai, selesai: i.selesai, jumlahJam: jam.length,
    totalHarga: rincian.reduce((n, r) => n + r.harga, 0),
    batasBayarPada: batasBayar(now, i.tanggal, i.mulai), now,
    slot: rincian.map((r) => ({ jam: r.jam, hargaPerJam: r.harga })),
  });
  // Store memeriksa ulang di dalam transaksi: permintaan bersamaan hanya satu yang menang (BR-01).
  return hasil ? { ok: true, kode: hasil.kode } : { ok: false, kode: 'TIDAK_TERSEDIA' };
}
