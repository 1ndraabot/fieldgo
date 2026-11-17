// Seed awal untuk FieldGo di Supabase: hanya lapangan (dummy) + akun admin.
// Idempoten: lapangan dilewati bila sudah ada; akun di-upsert. Jalankan: npm run db:seed-awal
// Pesanan dummy TIDAK dibuat (lihat prisma/seed.ts bila diperlukan untuk demo).
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth/crypto.ts';

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

// Akun admin pengembangan (FR-ADM-01). Sandi dummy, ganti untuk produksi.
const ADMIN = { nama: 'Admin FieldGo', email: 'admin@contoh.id', sandi: 'Admin123!' };

async function seedAdmin() {
  const ada = await db.pengguna.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: {
      nama: ADMIN.nama, email: ADMIN.email, nomorKontak: '081200000000', peran: 'admin',
      kataSandi: await hashPassword(ADMIN.sandi),
      emailTerverifikasiPada: new Date(),
    },
  });
  console.log(`Seed admin: ${ada.email} (peran ${ada.peran}).`);
}

async function main() {
  await seedLapangan();
  await seedAdmin();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
