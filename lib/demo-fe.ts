// Data dummy untuk halaman FE yang belum tersambung basis data (detail lapangan, riwayat, panel admin).
// Semua angka/jadwal PALSU dan hanya untuk tampilan (PRD 17.8: tanpa dummy sebagai pengganti fitur —
// loader basis data sungguhan menyusul per tahap PRD Bagian 12). Konsisten dengan lib/demo.ts.
import type { Ilustrasi } from './beranda.ts';
import { tambahHari, wibSekarang } from './format.ts';
import type { StatusPesanan } from './slots.ts';

const ilustrasiUntuk = (olahraga: string): Ilustrasi => {
  const n = olahraga.toLowerCase();
  if (n.includes('badminton')) return 'badminton';
  if (n.includes('basket')) return 'basket';
  if (n.includes('tenis')) return 'tenis';
  return 'futsal';
};

const hargaWeekend = (harga: number) => Math.round((harga * 1.2) / 5000) * 5000; // rumus sama dengan lib/demo.ts

export type AturanTarif = { tipeHari: 'weekday' | 'weekend'; jamMulai: number; jamSelesai: number; hargaPerJam: number };
export type BarisJamOperasional = { hari: number; buka: boolean; jamBuka: number; jamTutup: number };

export type LapanganDetail = {
  id: number; nama: string; olahraga: string; ilustrasi: Ilustrasi; rating: string;
  deskripsi: string; alamat: string; koordinat: string; kapasitas: string;
  fasilitas: string[];
  jamOperasional: BarisJamOperasional[];
  tarif: AturanTarif[];
  slotAktif: { tanggal: string; jam: number; status: StatusPesanan; batasBayarPada: Date | null }[];
};

const JAM_BUKA_STANDAR: BarisJamOperasional[] = [1, 2, 3, 4, 5, 6, 7].map((hari) => ({ hari, buka: true, jamBuka: 6, jamTutup: 24 }));

type DasarLapangan = Omit<LapanganDetail, 'slotAktif' | 'ilustrasi'> & { ilustrasi?: Ilustrasi };

const DASAR: DasarLapangan[] = [
  {
    id: 1, nama: 'Futsal Arena A', olahraga: 'Futsal', rating: '4.9',
    deskripsi: 'Lapangan futsal indoor dengan lantai vinyl premium, pencahayaan LED merata, dan tribun kecil untuk pendukung. Cocok untuk pertandingan rutin maupun turnamen komunitas.',
    alamat: 'Jl. Sudirman No. 24, Jakarta', koordinat: '−6,90344 · 107,64980',
    kapasitas: '10 pemain (5 lawan 5)',
    fasilitas: ['Indoor ber-AC', 'Lantai vinyl', 'Ball palu & vest', 'Ruang ganti + shower', 'Parkir mobil & motor', 'Kantin & dispenser'],
    jamOperasional: JAM_BUKA_STANDAR,
    tarif: [
      { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 17, hargaPerJam: 80000 },
      { tipeHari: 'weekday', jamMulai: 17, jamSelesai: 24, hargaPerJam: 95000 },
      { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 110000 },
    ],
  },
  {
    id: 2, nama: 'Badminton Court 1', olahraga: 'Badminton', rating: '4.8',
    deskripsi: 'Dua lapangan badminton indoor dengan lantai BWF standard, jaring bersegel, dan penerangan tanpa silau. Sewa per lapangan, maksimal 4 pemain.',
    alamat: 'Jl. Sudirman No. 24, Jakarta', koordinat: '−6,90351 · 107,64992',
    kapasitas: '4 pemain per lapangan',
    fasilitas: ['Indoor ber-AC', 'Lantai matras BWF', 'Sewa raket & shuttle', 'Ruang ganti', 'Parkir'],
    jamOperasional: JAM_BUKA_STANDAR,
    tarif: [
      { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 60000 },
      { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 75000 },
    ],
  },
  {
    id: 3, nama: 'Basket Outdoor', olahraga: 'Basket', rating: '4.7',
    deskripsi: 'Full court basket outdoor dengan lantai beton berlapis akrilik, dua ring, dan lampu sorot untuk main malam.',
    alamat: 'Jl. Merdeka No. 8, Jakarta', koordinat: '−6,90410 · 107,65030',
    kapasitas: '10 pemain (5 lawan 5)',
    fasilitas: ['Full court', 'Ring Fleksi', 'Lampu sorot', 'Papan skor manual', 'Parkir'],
    jamOperasional: JAM_BUKA_STANDAR,
    tarif: [
      { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 75000 },
      { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 90000 },
    ],
  },
  {
    id: 4, nama: 'Tenis Lapangan 1', olahraga: 'Tenis', rating: '4.8',
    deskripsi: 'Hard court outdoor standar ITF dengan net baru dan fasilitas tepi lapangan. Dipakai untuk latihan maupun pertandingan persahabatan.',
    alamat: 'Jl. Merdeka No. 8, Jakarta', koordinat: '−6,90432 · 107,65055',
    kapasitas: '4 pemain (ganda)',
    fasilitas: ['Hard court', 'Sewa raket & bola', 'Hakim kursi', 'Ruang ganti', 'Parkir'],
    jamOperasional: JAM_BUKA_STANDAR,
    tarif: [
      { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 85000 },
      { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 100000 },
    ],
  },
  {
    id: 5, nama: 'Mini Soccer', olahraga: 'Mini Soccer', rating: '4.9',
    deskripsi: 'Lapangan mini soccer outdoor berumput sintetis dengan pagar keliling dan lampu malam. Favorit untuk sparring komunitas di akhir pekan.',
    alamat: 'Jl. Melati No. 15, Jakarta', koordinat: '−6,90290 · 107,65120',
    kapasitas: '12 pemain (6 lawan 6)',
    fasilitas: ['Rumput sintetis', 'Lampu malam', 'Bola & vest', 'Ruang ganti', 'Kantin', 'Parkir luas'],
    jamOperasional: JAM_BUKA_STANDAR,
    tarif: [
      { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 250000 },
      { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 300000 },
    ],
  },
  {
    id: 6, nama: 'Badminton Court 2', olahraga: 'Badminton', rating: '4.6',
    deskripsi: 'Lapangan badminton indoor kedua dengan matras vinil. Pilihan alternatif saat Court 1 penuh.',
    alamat: 'Jl. Melati No. 15, Jakarta', koordinat: '−6,90281 · 107,65131',
    kapasitas: '4 pemain per lapangan',
    fasilitas: ['Indoor', 'Matras vinil', 'Sewa raket', 'Parkir'],
    jamOperasional: JAM_BUKA_STANDAR,
    tarif: [
      { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 60000 },
      { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: 75000 },
    ],
  },
];

/** Slot aktif palsu agar kalender menampilkan variasi status (terisi/ditahan). */
const slotAktifUntuk = (id: number, now: Date) => {
  const tanggal = wibSekarang(now).tanggal;
  const tahan = new Date(now.getTime() + 5 * 3600_000);
  const peta: Record<number, { jam: number; status: StatusPesanan }[]> = {
    1: [{ jam: 10, status: 'terkonfirmasi' }, { jam: 19, status: 'menunggu_verifikasi' }],
    2: [{ jam: 8, status: 'terkonfirmasi' }, { jam: 20, status: 'menunggu_pembayaran' }],
    3: [{ jam: 16, status: 'terkonfirmasi' }],
    4: [{ jam: 7, status: 'menunggu_pembayaran' }, { jam: 18, status: 'terkonfirmasi' }],
    5: [{ jam: 20, status: 'terkonfirmasi' }, { jam: 21, status: 'terkonfirmasi' }],
    6: [],
  };
  return (peta[id] ?? []).map((s) => ({ tanggal, jam: s.jam, status: s.status, batasBayarPada: tahan }));
};

export function getLapanganDetail(id: number, now = new Date()): LapanganDetail | null {
  const d = DASAR.find((x) => x.id === id);
  if (!d) return null;
  return { ...d, ilustrasi: d.ilustrasi ?? ilustrasiUntuk(d.olahraga), slotAktif: slotAktifUntuk(id, now) };
}

// ─── Riwayat penyewa (dummy sesi: Rani Putri) ───────────────────────────────

export type BarisRiwayat = {
  kode: string; lapanganId: number; lapanganNama: string;
  tanggal: string; jamMulai: number; jamSelesai: number; jumlahJam: number;
  totalHarga: number; status: StatusPesanan; dibuatPada: Date;
  batasBayarPada: Date | null; alasanPenolakan: string | null;
};

export function getRiwayat(now = new Date()): BarisRiwayat[] {
  const hariIni = wibSekarang(now).tanggal;
  const t = (n: number) => tambahHari(hariIni, n);
  const lalu = (jam: number) => new Date(now.getTime() - jam * 3600_000);
  const nanti = (jam: number) => new Date(now.getTime() + jam * 3600_000);
  return [
    { kode: 'GLG-1042', lapanganId: 1, lapanganNama: 'Futsal Arena A', tanggal: t(2), jamMulai: 20, jamSelesai: 22, jumlahJam: 2, totalHarga: 190000, status: 'menunggu_pembayaran', dibuatPada: lalu(3), batasBayarPada: nanti(21), alasanPenolakan: null },
    { kode: 'GLG-1039', lapanganId: 2, lapanganNama: 'Badminton Court 1', tanggal: t(1), jamMulai: 8, jamSelesai: 9, jumlahJam: 1, totalHarga: 60000, status: 'menunggu_verifikasi', dibuatPada: lalu(20), batasBayarPada: nanti(4), alasanPenolakan: null },
    { kode: 'GLG-1035', lapanganId: 1, lapanganNama: 'Futsal Arena A', tanggal: t(5), jamMulai: 19, jamSelesai: 21, jumlahJam: 2, totalHarga: 190000, status: 'terkonfirmasi', dibuatPada: lalu(72), batasBayarPada: null, alasanPenolakan: null },
    { kode: 'GLG-1033', lapanganId: 4, lapanganNama: 'Tenis Lapangan 1', tanggal: t(3), jamMulai: 17, jamSelesai: 18, jumlahJam: 1, totalHarga: 85000, status: 'pengajuan_pembatalan', dibuatPada: lalu(96), batasBayarPada: null, alasanPenolakan: null },
    { kode: 'GLG-0120', lapanganId: 5, lapanganNama: 'Mini Soccer', tanggal: t(-4), jamMulai: 16, jamSelesai: 18, jumlahJam: 2, totalHarga: 500000, status: 'selesai', dibuatPada: lalu(240), batasBayarPada: null, alasanPenolakan: null },
    { kode: 'GLG-0101', lapanganId: 3, lapanganNama: 'Basket Outdoor', tanggal: t(-9), jamMulai: 10, jamSelesai: 11, jumlahJam: 1, totalHarga: 75000, status: 'selesai', dibuatPada: lalu(400), batasBayarPada: null, alasanPenolakan: null },
    { kode: 'GLG-0098', lapanganId: 6, lapanganNama: 'Badminton Court 2', tanggal: t(-6), jamMulai: 9, jamSelesai: 10, jumlahJam: 1, totalHarga: 60000, status: 'dibatalkan', dibuatPada: lalu(300), batasBayarPada: null, alasanPenolakan: null },
    { kode: 'GLG-0090', lapanganId: 1, lapanganNama: 'Futsal Arena A', tanggal: t(-12), jamMulai: 21, jamSelesai: 22, jumlahJam: 1, totalHarga: 95000, status: 'ditolak', dibuatPada: lalu(480), batasBayarPada: null, alasanPenolakan: 'Bukti transfer tidak terbaca dan nominal tidak sesuai total pesanan.' },
    { kode: 'GLG-0085', lapanganId: 2, lapanganNama: 'Badminton Court 1', tanggal: t(-15), jamMulai: 13, jamSelesai: 14, jumlahJam: 1, totalHarga: 60000, status: 'kedaluwarsa', dibuatPada: lalu(600), batasBayarPada: lalu(576), alasanPenolakan: null },
  ];
}

// ─── Detail pesanan + linimasa ──────────────────────────────────────────────

export type EntriRiwayat = { waktu: Date; statusBaru: StatusPesanan; oleh: string; catatan: string | null };
export type DetailPesanan = BarisRiwayat & {
  riwayat: EntriRiwayat[];
  bukti: { namaBerkas: string; diunggahPada: Date } | null;
  pengajuanBatal: { alasan: string; keadaan: 'menunggu' | 'disetujui' | 'ditolak'; catatanAdmin: string | null } | null;
};

/** Linimasa status sesuai siklus PRD Bagian 5. */
function linimasa(b: BarisRiwayat, now: Date): EntriRiwayat[] {
  const e: EntriRiwayat[] = [ { waktu: b.dibuatPada, statusBaru: 'menunggu_pembayaran' as StatusPesanan, oleh: 'Sistem', catatan: 'Pesanan dibuat, slot ditahan.' } ];
  const butuhBukti = ['menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan', 'selesai', 'ditolak'];
  if (butuhBukti.includes(b.status)) {
    e.push({ waktu: new Date(b.dibuatPada.getTime() + 2 * 3600_000), statusBaru: 'menunggu_verifikasi', oleh: 'Penyewa', catatan: 'Bukti transfer diunggah.' });
  }
  const peta: Partial<Record<StatusPesanan, EntriRiwayat>> = {
    terkonfirmasi: { waktu: new Date(b.dibuatPada.getTime() + 5 * 3600_000), statusBaru: 'terkonfirmasi', oleh: 'Admin', catatan: 'Bukti transfer disetujui.' },
    ditolak: { waktu: new Date(b.dibuatPada.getTime() + 6 * 3600_000), statusBaru: 'ditolak', oleh: 'Admin', catatan: b.alasanPenolakan },
    kedaluwarsa: { waktu: b.batasBayarPada ?? b.dibuatPada, statusBaru: 'kedaluwarsa', oleh: 'Sistem', catatan: 'Batas bayar terlewati tanpa bukti; slot dilepas.' },
    dibatalkan: { waktu: new Date(b.dibuatPada.getTime() + 1 * 3600_000), statusBaru: 'dibatalkan', oleh: 'Penyewa', catatan: 'Dibatalkan langsung sebelum membayar; slot dilepas.' },
    selesai: { waktu: new Date(b.dibuatPada.getTime() + 48 * 3600_000), statusBaru: 'selesai', oleh: 'Sistem', catatan: 'Jam main selesai; masuk rekap.' },
    pengajuan_pembatalan: { waktu: new Date(b.dibuatPada.getTime() + 24 * 3600_000), statusBaru: 'pengajuan_pembatalan', oleh: 'Penyewa', catatan: 'Form pengajuan pembatalan dikirim; slot tetap terisi.' },
  };
  const akhir = peta[b.status];
  if (akhir) e.push(akhir);
  return e;
}

export function getDetailPesanan(kode: string, now = new Date()): DetailPesanan | null {
  const b = getRiwayat(now).find((x) => x.kode === kode);
  if (!b) return null;
  const butuhBukti = ['menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan', 'selesai', 'ditolak'];
  return {
    ...b,
    riwayat: linimasa(b, now),
    bukti: butuhBukti.includes(b.status) ? { namaBerkas: `bukti-${b.kode.toLowerCase()}.jpg`, diunggahPada: new Date(b.dibuatPada.getTime() + 2 * 3600_000) } : null,
    pengajuanBatal: b.status === 'pengajuan_pembatalan'
      ? { alasan: 'Turnamen panitia dibatalkan karena cuaca.', keadaan: 'menunggu', catatanAdmin: null }
      : null,
  };
}

// ─── Panel admin ────────────────────────────────────────────────────────────

export type BarisAdminLapangan = { id: number; nama: string; olahraga: string; hargaMulai: number; aktif: boolean };

export function getAdminLapangan(): BarisAdminLapangan[] {
  return DASAR.map((d, i) => ({
    id: d.id, nama: d.nama, olahraga: d.olahraga,
    hargaMulai: Math.min(...d.tarif.map((t) => t.hargaPerJam)),
    aktif: i !== 5, // satu lapangan nonaktif agar keadaan kelola terlihat (BR-17)
  }));
}

export function getAdminTarif(lapanganId: number): { lapanganNama: string; aturan: AturanTarif[] } | null {
  const d = DASAR.find((x) => x.id === lapanganId);
  return d ? { lapanganNama: d.nama, aturan: d.tarif } : null;
}

export function getAdminJamOperasional(lapanganId: number): { lapanganNama: string; baris: BarisJamOperasional[] } | null {
  const d = DASAR.find((x) => x.id === lapanganId);
  return d ? { lapanganNama: d.nama, baris: d.jamOperasional } : null;
}

export type BarisBlokir = { id: number; lapanganNama: string; tanggalMulai: string; tanggalSelesai: string; jamMulai: number | null; jamSelesai: number | null; alasan: string };

export function getAdminBlacklist(now = new Date()): { baris: BarisBlokir[]; bentrokDemo: string[] } {
  const hariIni = wibSekarang(now).tanggal;
  return {
    baris: [
      { id: 1, lapanganNama: 'Futsal Arena A', tanggalMulai: tambahHari(hariIni, 10), tanggalSelesai: tambahHari(hariIni, 10), jamMulai: null, jamSelesai: null, alasan: 'Perbaikan lampu sorot.' },
      { id: 2, lapanganNama: 'Mini Soccer', tanggalMulai: tambahHari(hariIni, 14), tanggalSelesai: tambahHari(hariIni, 15), jamMulai: 6, jamSelesai: 12, alasan: 'Turnamen internal penyelenggara.' },
    ],
    bentrokDemo: ['GLG-1035 · Futsal Arena A · 19.00–21.00 · Terkonfirmasi', 'GLG-1042 · Futsal Arena A · 20.00–22.00 · Menunggu pembayaran'],
  };
}

export type AntrianBukti = { kode: string; penyewa: string; lapanganNama: string; tanggal: string; jamMulai: number; jamSelesai: number; total: number; jenisBukti: 'JPG' | 'PNG' | 'PDF'; diunggahPada: Date };
export type AntrianBatal = { kode: string; penyewa: string; kontak: string; alasan: string; namaBank: string; nomorRekening: string; atasNama: string; diajukanPada: Date };

export function getAdminVerifikasi(now = new Date()): { bukti: AntrianBukti[]; pembatalan: AntrianBatal[] } {
  const hariIni = wibSekarang(now).tanggal;
  return {
    bukti: [
      { kode: 'GLG-1042', penyewa: 'Rani Putri', lapanganNama: 'Futsal Arena A', tanggal: tambahHari(hariIni, 2), jamMulai: 20, jamSelesai: 22, total: 190000, jenisBukti: 'JPG', diunggahPada: new Date(now.getTime() - 1 * 3600_000) },
      { kode: 'GLG-1051', penyewa: 'Bima Ardiansyah', lapanganNama: 'Badminton Court 1', tanggal: tambahHari(hariIni, 3), jamMulai: 9, jamSelesai: 11, total: 120000, jenisBukti: 'PDF', diunggahPada: new Date(now.getTime() - 6 * 3600_000) },
      { kode: 'GLG-1055', penyewa: 'Salsabila N.', lapanganNama: 'Mini Soccer', tanggal: tambahHari(hariIni, 4), jamMulai: 19, jamSelesai: 21, total: 500000, jenisBukti: 'PNG', diunggahPada: new Date(now.getTime() - 20 * 3600_000) },
    ],
    pembatalan: [
      { kode: 'GLG-1033', penyewa: 'Rani Putri', kontak: '081200000000', alasan: 'Turnamen panitia dibatalkan karena cuaca.', namaBank: 'BCA', nomorRekening: '1234 567 890', atasNama: 'Rani Putri', diajukanPada: new Date(now.getTime() - 2 * 3600_000) },
      { kode: 'GLG-1028', penyewa: 'Bima Ardiansyah', kontak: '081298765432', alasan: 'Jadwal kantor berubah.', namaBank: 'Mandiri', nomorRekening: '9876 543 210', atasNama: 'Bima Ardiansyah', diajukanPada: new Date(now.getTime() - 9 * 3600_000) },
    ],
  };
}

export type BarisAdminPesanan = BarisRiwayat & { penyewa: string };

export function getAdminPesanan(now = new Date()): BarisAdminPesanan[] {
  const penyewa: Record<string, string> = { 'GLG-1042': 'Rani Putri', 'GLG-1039': 'Bima Ardiansyah', 'GLG-1035': 'Rani Putri', 'GLG-1033': 'Rani Putri', 'GLG-0120': 'Salsabila N.', 'GLG-0101': 'Bima Ardiansyah', 'GLG-0098': 'Salsabila N.', 'GLG-0090': 'Bima Ardiansyah', 'GLG-0085': 'Rani Putri' };
  return getRiwayat(now).map((b) => ({ ...b, penyewa: penyewa[b.kode] ?? '—' }));
}

export type BarisRekap = { lapangan: string; olahraga: string; pesanan: number; jam: number; pendapatan: number };

export function getAdminRekap(): { periodeLabel: string; baris: BarisRekap[] } {
  return {
    periodeLabel: 'November 2026', // dummy: label periode tetap untuk tampilan
    baris: [
      { lapangan: 'Futsal Arena A', olahraga: 'Futsal', pesanan: 38, jam: 64, pendapatan: 5_980_000 },
      { lapangan: 'Badminton Court 1', olahraga: 'Badminton', pesanan: 45, jam: 47, pendapatan: 2_820_000 },
      { lapangan: 'Badminton Court 2', olahraga: 'Badminton', pesanan: 21, jam: 21, pendapatan: 1_260_000 },
      { lapangan: 'Basket Outdoor', olahraga: 'Basket', pesanan: 12, jam: 14, pendapatan: 1_050_000 },
      { lapangan: 'Tenis Lapangan 1', olahraga: 'Tenis', pesanan: 17, jam: 19, pendapatan: 1_615_000 },
      { lapangan: 'Mini Soccer', olahraga: 'Mini Soccer', pesanan: 9, jam: 18, pendapatan: 4_500_000 },
    ],
  };
}

export type BarisPengguna = { id: number; nama: string; email: string; kontak: string; aktif: boolean; terverifikasi: boolean; jumlahPesanan: number; gabung: string };

export function getAdminPengguna(): BarisPengguna[] {
  return [
    { id: 1, nama: 'Rani Putri', email: 'penyewa@contoh.id', kontak: '081200000000', aktif: true, terverifikasi: true, jumlahPesanan: 6, gabung: '2 Mar 2026' },
    { id: 2, nama: 'Bima Ardiansyah', email: 'bima@contoh.id', kontak: '081298765432', aktif: true, terverifikasi: true, jumlahPesanan: 4, gabung: '18 Mar 2026' },
    { id: 3, nama: 'Salsabila N.', email: 'salsa@contoh.id', kontak: '081277712345', aktif: true, terverifikasi: true, jumlahPesanan: 3, gabung: '5 Apr 2026' },
    { id: 4, nama: 'Dimas Prayoga', email: 'dimas@contoh.id', kontak: '081255566677', aktif: false, terverifikasi: true, jumlahPesanan: 9, gabung: '2 Feb 2026' },
    { id: 5, nama: 'Nadia Kusuma', email: 'nadia@contoh.id', kontak: '081211122233', aktif: true, terverifikasi: false, jumlahPesanan: 0, gabung: '9 Nov 2026' },
  ];
}

export type PengaturanData = { bank: string; nomorRekening: string; atasNama: string; batasBayarJam: number; batasPembatalanHari: number };

export function getAdminPengaturan(): PengaturanData {
  return { bank: 'Bank BCA', nomorRekening: '1234 567 890', atasNama: 'Gelanggang Sport', batasBayarJam: 24, batasPembatalanHari: 1 };
}
