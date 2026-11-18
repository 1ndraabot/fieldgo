import type { StatusPesanan } from '../slots.ts';

/** Satu baris daftar riwayat (FR-HIS-02). Tanggal `YYYY-MM-DD` dalam WIB. */
export type BarisRiwayat = {
  kode: string; lapanganId: number; lapanganNama: string;
  tanggal: string; jamMulai: number; jamSelesai: number; jumlahJam: number;
  totalHarga: number; status: StatusPesanan; dibuatPada: Date;
  batasBayarPada: Date | null; alasanPenolakan: string | null;
};

export type EntriRiwayat = { waktu: Date; statusBaru: StatusPesanan; oleh: string; catatan: string | null };

/** Detail pesanan + linimasa status, bukti, dan keputusan pembatalan (FR-HIS-03). */
export type DetailPesanan = BarisRiwayat & {
  riwayat: EntriRiwayat[];
  bukti: { namaBerkas: string; diunggahPada: Date } | null;
  pengajuanBatal: { alasan: string; keadaan: 'menunggu' | 'disetujui' | 'ditolak'; catatanAdmin: string | null } | null;
};
