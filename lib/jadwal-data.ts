import { db } from './db.ts';
import { DEMO, demoJadwal } from './demo.ts';
import { wibSekarang } from './format.ts';
import { jadwalAktif } from './jadwal.ts';

/** Jadwal milik satu penyewa. `penggunaId` HARUS dari sesi server, tidak pernah dari request (PRD 17.4). */
export async function getJadwalSaya(penggunaId: number, now = new Date()) {
  if (DEMO) return demoJadwal(now); // tanpa database: data contoh
  const hariIni = wibSekarang(now).tanggal;
  const rows = await db.pesanan.findMany({
    where: {
      penggunaId,
      status: { in: ['terkonfirmasi', 'menunggu_pembayaran'] },
      tanggalMain: { gte: new Date(hariIni + 'T00:00:00Z') },
    },
    include: { lapangan: { select: { nama: true } } },
    orderBy: [{ tanggalMain: 'asc' }, { jamMulai: 'asc' }],
    take: 100, // shortcut: jadwal mendatang satu penyewa kecil; beri pagination bila dibutuhkan
  });
  return jadwalAktif(rows.map((r) => ({
    kode: r.kodePesanan, lapanganNama: r.lapangan.nama, tanggal: r.tanggalMain.toISOString().slice(0, 10),
    jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, jumlahJam: r.jumlahJam, totalHarga: r.totalHarga,
    status: r.status, batasBayarPada: r.batasBayarPada,
  })), now);
}
