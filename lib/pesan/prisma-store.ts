import { db } from '../db.ts';
import { tanggalKeDate } from './rules.ts';
import { kodePesanan, type PesanStore } from './service.ts';

// Pesanan yang masih memegang slot. Menunggu pembayaran hanya memegang sampai batas bayarnya (BR-09).
const STATUS_MEMEGANG = ['menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan'] as const;
const filterPemegang = (now: Date) => ({
  pesanan: {
    OR: [
      { status: { in: [...STATUS_MEMEGANG] } },
      { status: 'menunggu_pembayaran' as const, batasBayarPada: { gt: now } },
    ],
  },
});

export const prismaPesanStore: PesanStore = {
  ambilLapangan: (id) => db.lapangan.findUnique({
    where: { id },
    select: { id: true, nama: true, aktif: true, jamOperasional: true, tarif: true },
  }),

  async jamTerpakai(lapanganId, tanggal, now) {
    const rows = await db.slotPesanan.findMany({
      where: { lapanganId, tanggal: tanggalKeDate(tanggal), aktif: true, ...filterPemegang(now) },
      select: { jam: true },
    });
    return rows.map((r) => r.jam);
  },

  async jamDiblokir(lapanganId, tanggal) {
    const t = tanggalKeDate(tanggal);
    const rows = await db.blokirJadwal.findMany({
      where: { lapanganId, tanggalMulai: { lte: t }, tanggalSelesai: { gte: t } },
      select: { jamMulai: true, jamSelesai: true },
    });
    return rows;
  },

  async buat(d) {
    // Kode bisa (sangat jarang) bentrok dengan UNIQUE; coba beberapa kali dengan kode baru.
    for (let coba = 0; coba < 3; coba++) {
      try {
        return await db.$transaction(async (tx) => {
          // Kunci per lapangan+tanggal: permintaan bersamaan diserialkan, jadi tidak ada double booking
          // meski indeks unik parsial belum ada (BR-01). Dilepas otomatis saat transaksi selesai.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pesan:${d.lapanganId}:${d.tanggal}`}))`;

          const bentrok = await tx.slotPesanan.findFirst({
            where: {
              lapanganId: d.lapanganId, tanggal: tanggalKeDate(d.tanggal), aktif: true,
              jam: { in: d.slot.map((s) => s.jam) }, ...filterPemegang(d.now),
            },
            select: { id: true },
          });
          if (bentrok) return null;

          const p = await tx.pesanan.create({
            data: {
              kodePesanan: d.kode, penggunaId: d.penggunaId, lapanganId: d.lapanganId,
              tanggalMain: tanggalKeDate(d.tanggal), jamMulai: d.mulai, jamSelesai: d.selesai,
              jumlahJam: d.jumlahJam, totalHarga: d.totalHarga, batasBayarPada: d.batasBayarPada,
              status: 'menunggu_pembayaran',
              slot: { create: d.slot.map((s) => ({
                lapanganId: d.lapanganId, tanggal: tanggalKeDate(d.tanggal), jam: s.jam, hargaPerJam: s.hargaPerJam,
              })) },
              riwayat: { create: { statusBaru: 'menunggu_pembayaran', waktu: d.now, catatan: 'Pesanan dibuat, slot ditahan.' } },
            },
            select: { kodePesanan: true },
          });
          return { kode: p.kodePesanan };
        });
      } catch (e) {
        if ((e as { code?: string }).code === 'P2002' && coba < 2) {
          d = { ...d, kode: kodePesanan() };
          continue;
        }
        throw e;
      }
    }
    throw new Error('kode pesanan gagal dibuat setelah beberapa percobaan');
  },
};
