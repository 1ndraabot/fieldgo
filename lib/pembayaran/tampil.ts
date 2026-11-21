import type { StatusPesanan } from '../slots.ts';

export type Tampil = 'bayar' | 'verifikasi' | 'terkonfirmasi' | 'ditolak' | 'dibatalkan' | 'kedaluwarsa' | 'selesai' | 'pengajuan';
export type StatusLangkah = 'selesai' | 'aktif' | 'nanti';

/** Apa yang ditampilkan halaman Pembayaran. Lewat batas bayar = kedaluwarsa, walau penjadwal belum mengubah statusnya. */
export function tampilDari(status: StatusPesanan, batasBayarPada: Date, now: Date): Tampil {
  switch (status) {
    case 'menunggu_pembayaran': return batasBayarPada > now ? 'bayar' : 'kedaluwarsa';
    case 'menunggu_verifikasi': return 'verifikasi';
    case 'terkonfirmasi': return 'terkonfirmasi';
    case 'pengajuan_pembatalan': return 'pengajuan';
    case 'ditolak': return 'ditolak';
    case 'dibatalkan': return 'dibatalkan';
    case 'kedaluwarsa': return 'kedaluwarsa';
    case 'selesai': return 'selesai';
  }
}

/** Stepper "Pilih slot → Bayar → Verifikasi admin"; null = disembunyikan (pesanan gagal/berakhir). */
export function langkahStepper(t: Tampil): StatusLangkah[] | null {
  if (t === 'bayar') return ['selesai', 'aktif', 'nanti'];
  if (t === 'verifikasi') return ['selesai', 'selesai', 'aktif'];
  if (t === 'terkonfirmasi' || t === 'selesai' || t === 'pengajuan') return ['selesai', 'selesai', 'selesai'];
  return null;
}
