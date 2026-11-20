import { db } from '../../db.ts';
import type { StatusBayar } from '../../gateway/types.ts';
import {
  buatRefund, putuskanPembatalan, selesaikanRefundManual, sinkronkan, tinjauPembayaran,
  type HasilPengecualian, type KlaimRefund, type PengecualianDeps, type PembayaranUntukTinjau,
  type PesananUntukTinjau, type PengecualianStore,
} from './service.ts';

type RefundStatus = 'menunggu' | 'diproses' | 'berhasil' | 'gagal';

export const prismaPengecualianStore: PengecualianStore = {
  async pesananDenganSlot(kode) {
    const p = await db.pesanan.findUnique({
      where: { kodePesanan: kode },
      select: { id: true, kodePesanan: true, status: true, totalHarga: true },
    });
    return p && { id: p.id, kode: p.kodePesanan, status: p.status, totalHarga: p.totalHarga };
  },

  async pembayaranTinjau(pesananId) {
    const t = await db.pembayaranGateway.findFirst({
      where: { pesananId, OR: [{ perluTinjau: true }, { status: 'perlu_tinjau' }] },
      orderBy: { dibuatPada: 'desc' },
      select: { id: true, orderId: true, provider: true, status: true, jumlah: true, alasanTinjau: true },
    });
    return t && { id: t.id, orderId: t.orderId, provider: t.provider, status: t.status as StatusBayar, jumlah: t.jumlah, alasan: t.alasanTinjau };
  },

  async transaksiTerakhir(kode) {
    const t = await db.pembayaranGateway.findFirst({
      where: { pesanan: { kodePesanan: kode } },
      orderBy: { dibuatPada: 'desc' },
      select: { orderId: true },
    });
    return t && { orderId: t.orderId };
  },

  async pembayaranTertagih(kode) {
    const t = await db.pembayaranGateway.findFirst({
      where: { pesanan: { kodePesanan: kode }, status: { in: ['dibayar', 'perlu_tinjau'] } },
      orderBy: { dibuatPada: 'desc' },
      select: { id: true, orderId: true, jumlah: true },
    });
    return t && { id: t.id, orderId: t.orderId, jumlah: t.jumlah };
  },

  async terimaPembayaran(d) {
    return db.$transaction(async (tx): Promise<'ok' | 'STATUS_BERUBAH' | 'SLOT_TERPAKAI'> => {
      const p = await tx.pesanan.findUnique({
        where: { id: d.pesananId },
        select: {
          status: true, lapanganId: true, tanggalMain: true,
          slot: { where: { aktif: true }, select: { jam: true } },
        },
      });
      if (!p || p.status !== 'menunggu_pembayaran' || p.slot.length === 0) return 'STATUS_BERUBAH';

      // Slot bisa saja sudah dipesan orang lain setelah pesanan kedaluwarsa: periksa ulang.
      const bentrok = await tx.slotPesanan.findFirst({
        where: {
          lapanganId: p.lapanganId, tanggal: p.tanggalMain, aktif: true,
          jam: { in: p.slot.map((s) => s.jam) }, pesananId: { not: d.pesananId },
        },
        select: { id: true },
      });
      if (bentrok) return 'SLOT_TERPAKAI';

      const upd = await tx.pembayaranGateway.updateMany({
        where: { id: d.pembayaranId, status: 'perlu_tinjau' },
        data: { status: 'dibayar', perluTinjau: false },
      });
      if (upd.count !== 1) return 'STATUS_BERUBAH';

      await tx.pesanan.update({ where: { id: d.pesananId }, data: { status: 'terkonfirmasi' } });
      await tx.riwayatStatus.create({
        data: {
          pesananId: d.pesananId, statusLama: 'menunggu_pembayaran', statusBaru: 'terkonfirmasi',
          diubahOleh: d.adminId, waktu: d.now, catatan: d.catatan,
        },
      });
      return 'ok';
    });
  },

  async klaimRefundPembayaran(d): Promise<KlaimRefund | 'TIDAK_DITEMUKAN' | 'SUDAH_ADA_REFUND'> {
    try {
      return await db.$transaction(async (tx): Promise<KlaimRefund | 'TIDAK_DITEMUKAN' | 'SUDAH_ADA_REFUND'> => {
        const pb = await tx.pembayaranGateway.findFirst({
          where: { pesananId: d.pesananId, OR: [{ perluTinjau: true }, { status: 'perlu_tinjau' }] },
          orderBy: { dibuatPada: 'desc' },
          select: { id: true, orderId: true, jumlah: true },
        });
        if (!pb) return 'TIDAK_DITEMUKAN';

        // Satu refund aktif per transaksi tertagih; refund gagal boleh dicoba ulang lewat tab Refund.
        const ada = await tx.refund.findFirst({
          where: { pembayaranGatewayId: pb.id, status: { not: 'gagal' } },
          select: { id: true },
        });
        if (ada) return 'SUDAH_ADA_REFUND';

        const refund = await tx.refund.create({
          data: {
            pesananId: d.pesananId, pembayaranGatewayId: pb.id, nominal: d.nominal,
            alasan: d.alasan, cara: 'gateway', status: 'menunggu',
            catatan: d.catatan, diputuskanOleh: d.adminId, diputuskanPada: d.now,
          },
          select: { id: true },
        });

        // Keputusan sudah diambil → keluarkan pembayaran dari antrean pengecualian.
        // Uang memang sudah masuk, jadi status kembali `dibayar`; webhook refund provider
        // yang kelak mengubahnya menjadi `refund`.
        await tx.pembayaranGateway.update({
          where: { id: pb.id },
          data: { perluTinjau: false, status: 'dibayar' },
        });

        // Uang dikembalikan → pesanan tidak boleh tetap menggantung "menunggu pembayaran".
        const psn = await tx.pesanan.findUnique({ where: { id: d.pesananId }, select: { status: true } });
        if (!psn) return 'TIDAK_DITEMUKAN';
        const upd = await tx.pesanan.updateMany({
          where: { id: d.pesananId, status: 'menunggu_pembayaran' },
          data: { status: 'dibatalkan' },
        });
        if (upd.count === 1) {
          await tx.slotPesanan.updateMany({ where: { pesananId: d.pesananId, aktif: true }, data: { aktif: false } });
          await tx.riwayatStatus.create({
            data: {
              pesananId: d.pesananId, statusLama: 'menunggu_pembayaran', statusBaru: 'dibatalkan',
              diubahOleh: d.adminId, waktu: d.now,
              catatan: `Pembayaran bermasalah di-refund (${d.alasan}).`,
            },
          });
        }

        return { refundId: refund.id, orderId: pb.orderId, jumlah: pb.jumlah, adaTagihan: true };
      });
    } catch (e) {
      console.error('[admin-pengecualian] klaimRefundPembayaran', e);
      throw e;
    }
  },

  async buatRefundBaru(d): Promise<KlaimRefund | 'TIDAK_DITEMUKAN'> {
    return db.$transaction(async (tx): Promise<KlaimRefund | 'TIDAK_DITEMUKAN'> => {
      const p = await tx.pesanan.findUnique({
        where: { kodePesanan: d.kode },
        select: {
          id: true,
          pembayaranGateway: {
            where: { status: { in: ['dibayar', 'perlu_tinjau'] } },
            orderBy: { dibuatPada: 'desc' }, take: 1,
            select: { id: true, orderId: true, jumlah: true },
          },
        },
      });
      if (!p) return 'TIDAK_DITEMUKAN';
      const pg = p.pembayaranGateway[0] ?? null;

      const refund = await tx.refund.create({
        data: {
          pesananId: p.id, pembayaranGatewayId: pg?.id ?? null, nominal: d.nominal,
          alasan: d.alasan, cara: d.cara, status: 'menunggu',
          catatan: d.catatan, diputuskanOleh: d.adminId, diputuskanPada: d.now,
        },
        select: { id: true },
      });
      return {
        refundId: refund.id, orderId: pg?.orderId ?? null,
        jumlah: pg?.jumlah ?? d.nominal, adaTagihan: !!pg,
      };
    });
  },

  async putuskanBatalSetujui(d): Promise<KlaimRefund | 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH'> {
    return db.$transaction(async (tx): Promise<KlaimRefund | 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH'> => {
      const p = await tx.pesanan.findUnique({
        where: { kodePesanan: d.kode },
        select: {
          id: true, totalHarga: true,
          pengajuanPembatalan: { select: { id: true, status: true, alasan: true } },
        },
      });
      if (!p?.pengajuanPembatalan) return 'TIDAK_DITEMUKAN';
      if (p.pengajuanPembatalan.status !== 'menunggu') return 'STATUS_BERUBAH';

      const upd = await tx.pesanan.updateMany({
        where: { id: p.id, status: 'pengajuan_pembatalan' },
        data: { status: 'dibatalkan' },
      });
      if (upd.count !== 1) return 'STATUS_BERUBAH';

      await tx.pengajuanPembatalan.update({
        where: { id: p.pengajuanPembatalan.id },
        data: {
          status: 'disetujui', catatanAdmin: d.catatan, nominalRefund: d.nominalRefund,
          diputuskanOleh: d.adminId, diputuskanPada: d.now,
        },
      });
      // Slot langsung dapat dipesan ulang setelah pembatalan disetujui (FR-CAN-03).
      await tx.slotPesanan.updateMany({ where: { pesananId: p.id, aktif: true }, data: { aktif: false } });
      await tx.riwayatStatus.create({
        data: {
          pesananId: p.id, statusLama: 'pengajuan_pembatalan', statusBaru: 'dibatalkan',
          diubahOleh: d.adminId, waktu: d.now,
          catatan: `Pembatalan disetujui admin. ${d.catatan}`.trim(),
        },
      });

      const pg = await tx.pembayaranGateway.findFirst({
        where: { pesananId: p.id, status: 'dibayar' },
        orderBy: { dibuatPada: 'desc' },
        select: { id: true, orderId: true, jumlah: true },
      });
      const nominal = d.nominalRefund ?? p.totalHarga;
      const refund = await tx.refund.create({
        data: {
          pesananId: p.id, pembayaranGatewayId: pg?.id ?? null, nominal,
          alasan: p.pengajuanPembatalan.alasan, cara: pg ? 'gateway' : 'manual', status: 'menunggu',
          catatan: d.catatan, diputuskanOleh: d.adminId, diputuskanPada: d.now,
        },
        select: { id: true },
      });
      return {
        refundId: refund.id, orderId: pg?.orderId ?? null,
        jumlah: pg?.jumlah ?? nominal, adaTagihan: !!pg,
      };
    });
  },

  async putuskanBatalTolak(d): Promise<'ok' | 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH'> {
    return db.$transaction(async (tx): Promise<'ok' | 'TIDAK_DITEMUKAN' | 'STATUS_BERUBAH'> => {
      const p = await tx.pesanan.findUnique({
        where: { kodePesanan: d.kode },
        select: { id: true, status: true, pengajuanPembatalan: { select: { id: true, status: true } } },
      });
      if (!p?.pengajuanPembatalan) return 'TIDAK_DITEMUKAN';
      if (p.pengajuanPembatalan.status !== 'menunggu') return 'STATUS_BERUBAH';

      const upd = await tx.pesanan.updateMany({
        where: { id: p.id, status: 'pengajuan_pembatalan' },
        data: { status: 'terkonfirmasi' },
      });
      if (upd.count !== 1) return 'STATUS_BERUBAH';

      await tx.pengajuanPembatalan.update({
        where: { id: p.pengajuanPembatalan.id },
        data: { status: 'ditolak', catatanAdmin: d.catatan, diputuskanOleh: d.adminId, diputuskanPada: d.now },
      });
      // Slot sengaja tetap terisi — pesanan berlaku seperti biasa (FR-CAN-03).
      await tx.riwayatStatus.create({
        data: {
          pesananId: p.id, statusLama: 'pengajuan_pembatalan', statusBaru: 'terkonfirmasi',
          diubahOleh: d.adminId, waktu: d.now,
          catatan: `Pembatalan ditolak admin. ${d.catatan}`.trim(),
        },
      });
      return 'ok';
    });
  },

  async selesaikanRefund(d) {
    const r = await db.refund.updateMany({
      where: { id: d.refundId, pesanan: { kodePesanan: d.kode }, status: { in: ['menunggu', 'gagal'] } },
      data: { status: 'berhasil', cara: 'manual', selesaiPada: d.now, catatan: d.catatan },
    });
    return r.count === 1 ? 'ok' : 'TIDAK_DITEMUKAN';
  },

  async perbaruiRefundGateway(d) {
    if (d.berhasil) {
      const r = await db.refund.update({
        where: { id: d.refundId },
        data: { status: 'diproses', cara: 'gateway', referenceGateway: d.reference },
        select: { pembayaranGatewayId: true },
      });
      // Webhook refund dari provider akan menyusul; tandai transaksi sekarang agar UI konsisten.
      if (r.pembayaranGatewayId) {
        await db.pembayaranGateway.updateMany({
          where: { id: r.pembayaranGatewayId, status: { in: ['dibayar', 'perlu_tinjau'] } },
          data: { status: 'refund' },
        });
      }
      return;
    }
    await db.refund.update({
      where: { id: d.refundId },
      data: { status: 'gagal', cara: 'manual', catatan: d.catatan },
    });
  },
};
