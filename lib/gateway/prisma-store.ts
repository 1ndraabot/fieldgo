import { Prisma } from '@prisma/client';
import { db } from '../db.ts';
import type { StatusBayar } from './types.ts';
import { putusanNotifikasi } from './rules.ts';
import type { GatewayStore, HasilNotifikasi } from './service.ts';

const SUDAH_DIBAYAR: StatusBayar[] = ['dibayar', 'refund', 'sebagian_refund'];

type Tx = Prisma.TransactionClient;

async function tandaiReview(tx: Tx, id: number, alasan: string, d: { metode: string | null; waktuBayar: Date | null; now: Date }) {
  await tx.pembayaranGateway.update({
    where: { id },
    data: {
      status: 'perlu_tinjau',
      perluTinjau: true,
      alasanTinjau: alasan,
      metode: d.metode,
      dibayarPada: d.waktuBayar ?? d.now,
    },
  });
}

export const prismaGatewayStore: GatewayStore = {
  async cariPesananMilik(kode, penggunaId) {
    const p = await db.pesanan.findFirst({
      where: { kodePesanan: kode, penggunaId },
      select: {
        id: true, kodePesanan: true, penggunaId: true, status: true, totalHarga: true, batasBayarPada: true,
        lapangan: { select: { nama: true } },
        pengguna: { select: { nama: true, email: true } },
        slot: { orderBy: { jam: 'asc' }, select: { jam: true, hargaPerJam: true } },
      },
    });
    if (!p) return null;
    return {
      id: p.id,
      kode: p.kodePesanan,
      penggunaId: p.penggunaId,
      status: p.status,
      totalHarga: p.totalHarga,
      batasBayarPada: p.batasBayarPada,
      lapanganNama: p.lapangan.nama,
      namaPenyewa: p.pengguna.nama,
      email: p.pengguna.email,
      slot: p.slot.map((s) => ({ jam: s.jam, hargaPerJam: s.hargaPerJam })),
    };
  },

  async transaksiAktif(pesananId, now) {
    const t = await db.pembayaranGateway.findFirst({
      where: { pesananId, status: 'pending', kedaluwarsaPada: { gt: now } },
      orderBy: { dibuatPada: 'desc' },
      select: { orderId: true, token: true, redirectUrl: true, status: true, kedaluwarsaPada: true },
    });
    return t && t.redirectUrl
      ? { orderId: t.orderId, token: t.token, redirectUrl: t.redirectUrl, status: t.status, kedaluwarsaPada: t.kedaluwarsaPada }
      : null;
  },

  hitungPercobaan: (pesananId) => db.pembayaranGateway.count({ where: { pesananId } }),

  async simpanTransaksi(d) {
    const pilih = { orderId: true, token: true, redirectUrl: true, status: true, kedaluwarsaPada: true } as const;
    const rapikan = (t: { orderId: string; token: string | null; redirectUrl: string | null; status: StatusBayar; kedaluwarsaPada: Date | null }) => ({
      orderId: t.orderId,
      token: t.token,
      redirectUrl: t.redirectUrl ?? '',
      status: t.status,
      kedaluwarsaPada: t.kedaluwarsaPada,
    });

    try {
      const t = await db.pembayaranGateway.create({
        data: {
          pesananId: d.pesananId,
          provider: d.provider,
          orderId: d.orderId,
          jumlah: d.jumlah,
          token: d.token,
          redirectUrl: d.redirectUrl,
          kedaluwarsaPada: d.kedaluwarsaPada,
        },
        select: pilih,
      });
      return rapikan(t);
    } catch (e) {
      // Dua klik hampir bersamaan bisa menghasilkan order_id yang sama. Kembalikan
      // transaksi yang sudah tersimpan, bukan membuat tagihan kedua / galat 500.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const t = await db.pembayaranGateway.findUnique({ where: { orderId: d.orderId }, select: pilih });
        if (t) return rapikan(t);
      }
      throw e;
    }
  },

  async statusPesanan(kode, penggunaId) {
    const p = await db.pesanan.findFirst({
      where: { kodePesanan: kode, penggunaId },
      select: {
        status: true,
        batasBayarPada: true,
        pembayaranGateway: {
          orderBy: { dibuatPada: 'desc' },
          take: 1,
          select: { status: true, dibayarPada: true },
        },
      },
    });
    if (!p) return null;
    const t = p.pembayaranGateway[0];
    return { status: p.status, batasBayarPada: p.batasBayarPada, transaksi: t ?? null };
  },

  async prosesNotifikasi(d) {
    try {
      return await db.$transaction(async (tx): Promise<HasilNotifikasi> => {
        await tx.gatewayEvent.create({
          data: {
            provider: d.provider,
            eventKey: d.eventKey,
            orderId: d.orderId,
            tipe: d.tipe,
            payload: d.payload as Prisma.InputJsonValue,
          },
        });

        const pg = await tx.pembayaranGateway.findUnique({
          where: { orderId: d.orderId },
          include: { pesanan: { select: { id: true, status: true, batasBayarPada: true } } },
        });
        if (!pg) return 'tidak_ditemukan';

        const putusan = putusanNotifikasi({
          status: d.status,
          statusPembayaran: pg.status,
          statusPesanan: pg.pesanan.status,
          jumlahNotif: d.jumlah,
          jumlahDb: pg.jumlah,
          waktuBayar: d.waktuBayar,
          batasBayar: pg.pesanan.batasBayarPada,
          now: d.now,
        });

        switch (putusan) {
          case 'konfirmasi': {
            const upd = await tx.pesanan.updateMany({
              where: { id: pg.pesananId, status: 'menunggu_pembayaran' },
              data: { status: 'terkonfirmasi' },
            });
            if (upd.count !== 1) {
              await tandaiReview(tx, pg.id, 'STATUS_PESANAN_BERUBAH', d);
              return 'review_status';
            }
            await tx.pembayaranGateway.update({
              where: { id: pg.id },
              data: { status: 'dibayar', metode: d.metode, dibayarPada: d.waktuBayar ?? d.now },
            });
            await tx.riwayatStatus.create({
              data: {
                pesananId: pg.pesananId,
                statusLama: 'menunggu_pembayaran',
                statusBaru: 'terkonfirmasi',
                waktu: d.now,
                catatan: `Pembayaran ${d.metode ?? d.provider} diterima otomatis.`,
              },
            });
            return 'ok';
          }

          case 'review_nominal':
            await tandaiReview(tx, pg.id, 'NOMINAL_TIDAK_COCOK', d);
            return 'review_nominal';

          case 'review_telat':
            await tandaiReview(tx, pg.id, 'BAYAR_TERLAMBAT', d);
            return 'review_telat';

          case 'review_status':
            await tandaiReview(tx, pg.id, 'STATUS_PESANAN_BERUBAH', d);
            return 'review_status';

          case 'perlu_tinjau':
            await tandaiReview(tx, pg.id, 'PERLU_TINJAU_PROVIDER', d);
            return 'perlu_tinjau';

          case 'kedaluwarsa': {
            await tx.pembayaranGateway.updateMany({
              where: { id: pg.id, status: { notIn: SUDAH_DIBAYAR } },
              data: { status: 'kedaluwarsa' },
            });
            const lainDibayar = await tx.pembayaranGateway.findFirst({
              where: { pesananId: pg.pesananId, status: { in: SUDAH_DIBAYAR }, id: { not: pg.id } },
              select: { id: true },
            });
            // Bisa ada percobaan baru (mis. R2) yang masih berlaku saat notifikasi kedaluwarsa
            // transaksi lama datang terlambat. Jangan lepas slot milik percobaan baru itu.
            const lainAktif = await tx.pembayaranGateway.findFirst({
              where: {
                pesananId: pg.pesananId, id: { not: pg.id }, status: 'pending',
                kedaluwarsaPada: { gt: d.now },
              },
              select: { id: true },
            });
            if (!lainDibayar && !lainAktif) {
              const upd = await tx.pesanan.updateMany({
                where: { id: pg.pesananId, status: 'menunggu_pembayaran' },
                data: { status: 'kedaluwarsa' },
              });
              if (upd.count === 1) {
                await tx.slotPesanan.updateMany({ where: { pesananId: pg.pesananId, aktif: true }, data: { aktif: false } });
                await tx.riwayatStatus.create({
                  data: {
                    pesananId: pg.pesananId,
                    statusLama: 'menunggu_pembayaran',
                    statusBaru: 'kedaluwarsa',
                    waktu: d.now,
                    catatan: 'Transaksi gateway kedaluwarsa; slot dilepas.',
                  },
                });
              }
            }
            return 'kedaluwarsa';
          }

          case 'gagal':
            await tx.pembayaranGateway.updateMany({
              where: { id: pg.id, status: { notIn: SUDAH_DIBAYAR } },
              data: { status: 'gagal', metode: d.metode },
            });
            return 'gagal';

          case 'pending':
            await tx.pembayaranGateway.updateMany({
              where: { id: pg.id, status: 'pending' },
              data: { metode: d.metode },
            });
            return 'pending';

          case 'refund':
            await tx.pembayaranGateway.update({
              where: { id: pg.id },
              data: { status: d.status === 'sebagian_refund' ? 'sebagian_refund' : 'refund' },
            });
            return 'refund';

          case 'abaikan':
            return 'abaikan';
        }
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return 'duplikat';
      throw e;
    }
  },
};
