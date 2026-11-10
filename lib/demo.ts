// Mode DEMO: aktif otomatis selama `DATABASE_URL` belum diisi, supaya frontend bisa dilihat tanpa basis data.
// Semua data di sini palsu dan hanya dipakai di jalur baca (beranda, jadwal, pembayaran). Aksi tulis tetap butuh database.
import type { Pengguna } from './auth/service.ts';
import type { BerandaData, Ilustrasi, KartuLapangan } from './beranda.ts';
import type { PesananJadwal } from './jadwal.ts';
import type { HalamanBayar } from './pembayaran/data.ts';
import { tambahHari, wibSekarang } from './format.ts';
import { computeSlotStatuses } from './slots.ts';

export const DEMO = !process.env.DATABASE_URL;

/** Pengguna contoh untuk halaman yang butuh sesi (jadwal saya, pembayaran). */
export const DEMO_PENGGUNA: Pengguna = {
  id: 1,
  nama: 'Rani Putri',
  email: 'penyewa@contoh.id',
  kataSandi: '',
  nomorKontak: '081200000000',
  peran: 'penyewa',
  emailTerverifikasiPada: new Date(),
  dinonaktifkanPada: null,
};

type DaftarLapangan = { nama: string; olahraga: string; harga: number; deskripsi: string };

const LAPANGAN: DaftarLapangan[] = [
  { nama: 'Futsal Arena A', olahraga: 'Futsal', harga: 90000, deskripsi: 'Indoor · lantai vinyl' },
  { nama: 'Badminton Court 1', olahraga: 'Badminton', harga: 60000, deskripsi: 'Indoor · 4 pemain' },
  { nama: 'Basket Outdoor', olahraga: 'Basket', harga: 75000, deskripsi: 'Outdoor · full court' },
  { nama: 'Tenis Lapangan 1', olahraga: 'Tenis', harga: 85000, deskripsi: 'Outdoor · hard court' },
  { nama: 'Mini Soccer', olahraga: 'Mini soccer', harga: 250000, deskripsi: 'Outdoor · rumput sintetis' },
  { nama: 'Badminton Court 2', olahraga: 'Badminton', harga: 60000, deskripsi: 'Indoor · 4 pemain' },
];

const ilustrasiUntuk = (olahraga: string): Ilustrasi => {
  const n = olahraga.toLowerCase();
  if (n.includes('badminton')) return 'badminton';
  if (n.includes('basket')) return 'basket';
  if (n.includes('tenis')) return 'tenis';
  return 'futsal';
};

const JAM_BUKA = [1, 2, 3, 4, 5, 6, 7].map((hari) => ({ hari, buka: true, jamBuka: 6, jamTutup: 24 }));

const hitungSlot = (l: DaftarLapangan, tanggal: string, now: Date) => computeSlotStatuses({
  tanggal, now, lapanganAktif: true, jamOperasional: JAM_BUKA,
  tarif: [
    { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: l.harga },
    { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: Math.round((l.harga * 1.2) / 5000) * 5000 },
  ],
  blokir: [],
  // Dua jam "terisi" supaya tampilan slot tidak serba kosong; jam yang sudah lewat tetap jadi tidak tersedia.
  slotAktif: [10, 19].map((jam, i) => ({
    tanggal, jam,
    status: (i === 0 ? 'terkonfirmasi' : 'menunggu_verifikasi') as 'terkonfirmasi' | 'menunggu_verifikasi',
    batasBayarPada: new Date(now.getTime() + 5 * 3600_000),
  })),
});

export function demoBeranda(olahraga: string | null, tanggal: string, now: Date): BerandaData {
  const hariIni = wibSekarang(now).tanggal;
  const jenis = [...new Set(LAPANGAN.map((l) => l.olahraga))];
  const filter = olahraga && jenis.includes(olahraga) ? olahraga : null;

  const kartu: KartuLapangan[] = LAPANGAN.map((l, urutan) => ({
    id: urutan + 1, nama: l.nama, deskripsi: l.deskripsi, olahraga: l.olahraga,
    ilustrasi: ilustrasiUntuk(l.olahraga), hargaMulai: l.harga, fotoUrl: null, urutan,
  })).filter((k) => !filter || k.olahraga === filter);

  const unggulan = LAPANGAN[(kartu[0]?.id ?? 1) - 1];
  return {
    olahragaList: jenis,
    olahraga: filter,
    tanggal,
    hariIni,
    kartu,
    unggulan: unggulan ? { id: kartu[0].id, nama: unggulan.nama, slot: hitungSlot(unggulan, tanggal, now) } : null,
    slotKosongHariIni: LAPANGAN.reduce((n, l) => n + hitungSlot(l, hariIni, now).filter((s) => s.status === 'tersedia').length, 0),
    stats: { lapangan: LAPANGAN.length, cabang: jenis.length, jamTerpesan30Hari: 428 },
  };
}

export function demoJadwal(now: Date): { terkonfirmasi: PesananJadwal[]; menunggu: PesananJadwal[] } {
  const hariIni = wibSekarang(now).tanggal;
  const tanggal = (n: number) => tambahHari(hariIni, n);
  const base = { lapanganNama: 'Futsal Arena A', status: 'terkonfirmasi' as const };
  return {
    terkonfirmasi: [
      { ...base, kode: 'GLG-DEMO-0001', tanggal: tanggal(1), jamMulai: 19, jamSelesai: 21, jumlahJam: 2, totalHarga: 180000, batasBayarPada: now },
      { ...base, kode: 'GLG-DEMO-0002', tanggal: tanggal(3), jamMulai: 8, jamSelesai: 9, jumlahJam: 1, totalHarga: 90000, batasBayarPada: now },
    ],
    menunggu: [
      {
        kode: 'GLG-DEMO-0003', lapanganNama: 'Futsal Arena A', tanggal: tanggal(2), jamMulai: 20, jamSelesai: 22,
        jumlahJam: 2, totalHarga: 180000, status: 'menunggu_pembayaran', batasBayarPada: new Date(now.getTime() + 5 * 3600_000),
      },
    ],
  };
}

export function demoHalamanBayar(kode: string, now: Date): HalamanBayar {
  const tanggal = tambahHari(wibSekarang(now).tanggal, 2);
  return {
    kode,
    status: 'menunggu_pembayaran',
    batasBayarPada: new Date(now.getTime() + 5 * 3600_000),
    dibuatPada: now,
    alasanPenolakan: null,
    lapanganNama: 'Futsal Arena A',
    tanggal,
    jamMulai: 20,
    jamSelesai: 22,
    totalHarga: 180000,
    slot: [{ jam: 20, harga: 90000 }, { jam: 21, harga: 90000 }],
    rekening: { bank: 'Bank BCA', nomor: '1234 567 890', nama: 'Gelanggang Sport' },
  };
}
