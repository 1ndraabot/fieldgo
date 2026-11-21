import { db } from '../db.ts';
import type { PembayaranStore } from './service.ts';

export const prismaPembayaranStore: PembayaranStore = {
  async cariPesananMilik(kode, penggunaId) {
    const p = await db.pesanan.findFirst({
      where: { kodePesanan: kode, penggunaId }, // kepemilikan di kueri: pesanan orang lain = tidak ada
      select: { id: true, kodePesanan: true, penggunaId: true, status: true, batasBayarPada: true },
    });
    return p && { id: p.id, kode: p.kodePesanan, penggunaId: p.penggunaId, status: p.status, batasBayarPada: p.batasBayarPada };
  },

  catatBukti: (d) => db.$transaction(async (tx) => {
    // UPDATE bersyarat: bila penyewa membatalkan/kedaluwarsa bersamaan, hanya satu yang menang.
    const r = await tx.pesanan.updateMany({
      where: { id: d.pesananId, penggunaId: d.penggunaId, status: 'menunggu_pembayaran' },
      data: { status: 'menunggu_verifikasi' },
    });
    if (r.count !== 1) return false;
    await tx.pembayaran.create({ data: { pesananId: d.pesananId, berkasBukti: d.kunci, tipeBerkas: d.tipe, ukuranBerkas: d.ukuran, diunggahPada: d.now } });
    await tx.riwayatStatus.create({ data: { pesananId: d.pesananId, statusLama: 'menunggu_pembayaran', statusBaru: 'menunggu_verifikasi', diubahOleh: d.penggunaId, waktu: d.now } });
    return true;
  }),

  batalkan: (d) => db.$transaction(async (tx) => {
    const r = await tx.pesanan.updateMany({
      where: { id: d.pesananId, penggunaId: d.penggunaId, status: 'menunggu_pembayaran' },
      data: { status: 'dibatalkan' },
    });
    if (r.count !== 1) return false;
    await tx.slotPesanan.updateMany({ where: { pesananId: d.pesananId }, data: { aktif: false } }); // slot kembali tersedia
    await tx.riwayatStatus.create({ data: { pesananId: d.pesananId, statusLama: 'menunggu_pembayaran', statusBaru: 'dibatalkan', diubahOleh: d.penggunaId, waktu: d.now } });
    return true;
  }),
};
