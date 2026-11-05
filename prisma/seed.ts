// Data awal untuk pengembangan. Aman dijalankan ulang: tidak berbuat apa-apa bila sudah ada lapangan.
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const LAPANGAN = [
  { nama: 'Futsal Arena A', olahraga: 'Futsal', harga: 90000 },
  { nama: 'Badminton Court 1', olahraga: 'Badminton', harga: 60000 },
  { nama: 'Basket Outdoor', olahraga: 'Basket', harga: 75000 },
  { nama: 'Tenis Lapangan 1', olahraga: 'Tenis', harga: 85000 },
  { nama: 'Mini Soccer', olahraga: 'Mini soccer', harga: 250000 },
  { nama: 'Badminton Court 2', olahraga: 'Badminton', harga: 60000 },
];

async function main() {
  if ((await db.lapangan.count()) > 0) return console.log('Seed dilewati: sudah ada lapangan.');
  for (const l of LAPANGAN) {
    const jenis = await db.jenisOlahraga.upsert({ where: { nama: l.olahraga }, update: {}, create: { nama: l.olahraga } });
    await db.lapangan.create({
      data: {
        nama: l.nama, alamat: 'Jl. Sudirman No. 24', jenisOlahragaId: jenis.id,
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

main().finally(() => db.$disconnect());
