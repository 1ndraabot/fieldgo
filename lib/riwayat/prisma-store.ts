import { db } from '../db.ts';
import type { RiwayatStore } from './service.ts';

export const prismaRiwayatStore: RiwayatStore = {
  async cariPesananMilik(kode, penggunaId) {
    const p = await db.pesanan.findFirst({
      where: { kodePesanan: kode, penggunaId }, // kepemilikan di kueri: pesanan orang lain = tidak ada
      select: {
        id: true, penggunaId: true, status: true, tanggalMain: true,
        pengajuanPembatalan: { select: { id: true } },
      },
    });
    return p && {
      id: p.id, penggunaId: p.penggunaId, status: p.status,
      tanggal: p.tanggalMain.toISOString().slice(0, 10),
      sudahDiajukan: p.pengajuanPembatalan !== null,
    };
  },

  async ajukan(d) {
    try {
      return await db.$transaction(async (tx) => {
        // UPDATE bersyarat: bila status berubah bersamaan (mis. admin menolak bukti), hanya satu yang menang.
        const r = await tx.pesanan.updateMany({
          where: { id: d.pesananId, penggunaId: d.penggunaId, status: 'terkonfirmasi' },
          data: { status: 'pengajuan_pembatalan' },
        });
        if (r.count !== 1) return false;

        await tx.pengajuanPembatalan.create({
          data: {
            pesananId: d.pesananId, namaPemesan: d.namaPemesan, kontak: d.kontak, alasan: d.alasan,
            namaBank: d.namaBank, nomorRekening: d.nomorRekening, atasNama: d.atasNama,
            diajukanPada: d.now, status: 'menunggu',
          },
        });
        // Slot sengaja TIDAK dilepas: tetap terisi sampai admin memutuskan (FR-CAN-03).
        await tx.riwayatStatus.create({
          data: {
            pesananId: d.pesananId, statusLama: 'terkonfirmasi', statusBaru: 'pengajuan_pembatalan',
            diubahOleh: d.penggunaId, waktu: d.now,
            catatan: 'Pengajuan pembatalan dikirim; slot tetap terisi sampai keputusan admin.',
          },
        });
        return true;
      });
    } catch (e) {
      // UNIQUE(pesanan_id): pengajuan baru saja dibuat oleh permintaan lain (FR-CAN-04).
      if ((e as { code?: string }).code === 'P2002') return false;
      throw e;
    }
  },
};
