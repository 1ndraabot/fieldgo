// Data awal untuk pengembangan. Aman dijalankan ulang: tidak berbuat apa-apa bila sudah ada lapangan.
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/crypto.ts';
import { tambahHari, wibSekarang } from '../lib/format.ts';

const db = new PrismaClient();
const LAPANGAN = [
  { nama: 'Futsal Arena A', olahraga: 'Futsal', harga: 90000, deskripsi: 'Indoor · lantai vinyl' },
  { nama: 'Badminton Court 1', olahraga: 'Badminton', harga: 60000, deskripsi: 'Indoor · 4 pemain' },
  { nama: 'Basket Outdoor', olahraga: 'Basket', harga: 75000, deskripsi: 'Outdoor · full court' },
  { nama: 'Tenis Lapangan 1', olahraga: 'Tenis', harga: 85000, deskripsi: 'Outdoor · hard court' },
  { nama: 'Mini Soccer', olahraga: 'Mini soccer', harga: 250000, deskripsi: 'Outdoor · rumput sintetis' },
  { nama: 'Badminton Court 2', olahraga: 'Badminton', harga: 60000, deskripsi: 'Indoor · 4 pemain' },
];

async function seedLapangan() {
  if ((await db.lapangan.count()) > 0) return console.log('Seed lapangan dilewati: sudah ada lapangan.');
  for (const l of LAPANGAN) {
    const jenis = await db.jenisOlahraga.upsert({ where: { nama: l.olahraga }, update: {}, create: { nama: l.olahraga } });
    await db.lapangan.create({
      data: {
        nama: l.nama, deskripsi: l.deskripsi, alamat: 'Jl. Sudirman No. 24', jenisOlahragaId: jenis.id,
        jamOperasional: { create: [1, 2, 3, 4, 5, 6, 7].map((hari) => ({ hari, jamBuka: 6, jamTutup: 24 })) },
        tarif: { create: [
          { tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: l.harga },
          { tipeHari: 'weekend', jamMulai: 6, jamSelesai: 24, hargaPerJam: Math.round((l.harga * 1.2) / 5000) * 5000 },
        ] },
      },
    });
  }
  console.log(`Seed selesai: ${LAPANGAN.length} lapangan.`);
}

// Akun DUMMY untuk pengembangan (jangan dipakai di produksi). Sandi ada di README.
const AKUN = [
  { nama: 'Rani Putri', email: 'penyewa@contoh.id', sandi: 'Penyewa123!', peran: 'penyewa', verifikasi: true, nonaktif: false },
  { nama: 'Budi Baru', email: 'baru@contoh.id', sandi: 'Penyewa123!', peran: 'penyewa', verifikasi: false, nonaktif: false },
  { nama: 'Dewi Nonaktif', email: 'nonaktif@contoh.id', sandi: 'Penyewa123!', peran: 'penyewa', verifikasi: true, nonaktif: true },
  { nama: 'Admin Gelanggang', email: 'admin@contoh.id', sandi: 'Admin123!', peran: 'admin', verifikasi: true, nonaktif: false },
] as const;

async function seedAkun() {
  const sekarang = new Date();
  for (const a of AKUN) {
    await db.pengguna.upsert({
      where: { email: a.email },
      update: {},
      create: {
        nama: a.nama, email: a.email, nomorKontak: '081200000000', peran: a.peran,
        kataSandi: await hashPassword(a.sandi),
        emailTerverifikasiPada: a.verifikasi ? sekarang : null,
        dinonaktifkanPada: a.nonaktif ? sekarang : null,
      },
    });
  }
  console.log(`Seed akun dummy: ${AKUN.length} akun.`);
}

// DUMMY: pesanan contoh untuk penyewa@contoh.id agar halaman Jadwal saya berisi sebelum alur pemesanan dibangun.
// Tanggal relatif terhadap hari seed dijalankan. Hapus saat pemesanan sungguhan sudah ada.
async function seedPesanan() {
  if ((await db.pesanan.count()) > 0) return console.log('Seed pesanan dilewati: sudah ada pesanan.');
  const user = await db.pengguna.findUnique({ where: { email: 'penyewa@contoh.id' } });
  const lapangan = await db.lapangan.findFirst({ orderBy: { id: 'asc' } });
  if (!user || !lapangan) return;
  const hariIni = wibSekarang(new Date()).tanggal;
  const HARGA = 90000;
  const contoh = [
    { kode: 'GLG-DEMO-0001', hari: 1, mulai: 19, selesai: 21, status: 'terkonfirmasi' },
    { kode: 'GLG-DEMO-0002', hari: 3, mulai: 8, selesai: 9, status: 'terkonfirmasi' },
    { kode: 'GLG-DEMO-0003', hari: 2, mulai: 20, selesai: 22, status: 'menunggu_pembayaran' },
    { kode: 'GLG-DEMO-0004', hari: 4, mulai: 10, selesai: 11, status: 'menunggu_verifikasi' }, // sengaja tidak tampil di Jadwal saya
  ] as const;
  for (const c of contoh) {
    const tanggal = new Date(tambahHari(hariIni, c.hari) + 'T00:00:00Z');
    const jam = Array.from({ length: c.selesai - c.mulai }, (_, i) => c.mulai + i);
    await db.pesanan.create({
      data: {
        kodePesanan: c.kode, penggunaId: user.id, lapanganId: lapangan.id, tanggalMain: tanggal,
        jamMulai: c.mulai, jamSelesai: c.selesai, jumlahJam: jam.length, totalHarga: jam.length * HARGA, status: c.status,
        batasBayarPada: new Date(Date.now() + 6 * 3600_000),
        slot: { create: jam.map((j) => ({ lapanganId: lapangan.id, tanggal, jam: j, hargaPerJam: HARGA })) },
      },
    });
  }
  console.log(`Seed pesanan dummy: ${contoh.length} pesanan.`);
}

// Rekening tujuan transfer (PRD: tabel Pengaturan). DUMMY, ganti lewat admin atau langsung di basis data.
async function seedPengaturan() {
  const nilai = { rekening_bank: 'Bank BCA', rekening_nomor: '1234 567 890', rekening_nama: 'Gelanggang Sport' };
  for (const [nama, v] of Object.entries(nilai)) {
    await db.pengaturan.upsert({ where: { nama }, update: {}, create: { nama, nilai: v } });
  }
  console.log('Seed pengaturan: rekening tujuan dummy.');
}

async function main() {
  await seedPengaturan();
  await seedLapangan();
  await seedAkun();
  await seedPesanan();
}

main().finally(() => db.$disconnect());
