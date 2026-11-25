import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import { wibSekarang } from '../../format.ts';
import type { StatusPesanan } from '../../slots.ts';

export type BarisPengecualian = {
  orderId: string;
  kode: string;
  penyewa: string;
  lapanganNama: string;
  tanggal: string;
  jamMulai: number;
  jamSelesai: number;
  jumlah: number;
  metode: string | null;
  dibayarPada: Date | null;
  alasan: string;
  provider: string;
  statusPesanan: StatusPesanan;
  /** tinjau = uang sudah masuk perlu keputusan; pending = transaksi menggantung lewat batas. */
  jenis: 'tinjau' | 'pending';
};

export type BarisBatal = {
  kode: string;
  penyewa: string;
  kontak: string;
  alasan: string;
  namaBank: string;
  nomorRekening: string;
  atasNama: string;
  diajukanPada: Date;
  tanggal: string;
  jamMulai: number;
  jamSelesai: number;
  totalHarga: number;
};

export type BarisRefund = {
  id: number;
  kode: string;
  penyewa: string;
  nominal: number;
  alasan: string;
  cara: 'gateway' | 'manual';
  status: 'menunggu' | 'diproses' | 'berhasil' | 'gagal';
  referenceGateway: string | null;
  catatan: string | null;
  diputuskanPada: Date | null;
};

export type AntrianPembayaran = {
  pengecualian: BarisPengecualian[];
  pembatalan: BarisBatal[];
  refund: BarisRefund[];
};

const tanggal = (d: Date): string => d.toISOString().slice(0, 10);

/** Data antrean demo (mode tanpa basis data) supaya halaman tetap hidup. */
function demoAntrian(now: Date): AntrianPembayaran {
  const hariIni = wibSekarang(now).tanggal;
  return {
    pengecualian: [
      {
        orderId: 'FGO-1042', kode: 'FGO-1042', penyewa: 'Rani Putri', lapanganNama: 'Futsal Arena A',
        tanggal: hariIni, jamMulai: 20, jamSelesai: 22, jumlah: 190_000, metode: 'simulasi',
        dibayarPada: new Date(now.getTime() - 26 * 3600_000), alasan: 'BAYAR_TERLAMBAT',
        provider: 'fake', statusPesanan: 'menunggu_pembayaran', jenis: 'tinjau',
      },
      {
        orderId: 'FGO-1055-R2', kode: 'FGO-1055', penyewa: 'Salsabila N.', lapanganNama: 'Mini Soccer',
        tanggal: hariIni, jamMulai: 19, jamSelesai: 21, jumlah: 500_000, metode: null,
        dibayarPada: null, alasan: 'Transaksi pending melampaui batas', provider: 'fake',
        statusPesanan: 'menunggu_pembayaran', jenis: 'pending',
      },
    ],
    pembatalan: [
      {
        kode: 'FGO-1033', penyewa: 'Rani Putri', kontak: '081200000000',
        alasan: 'Turnamen panitia dibatalkan karena cuaca.', namaBank: 'BCA',
        nomorRekening: '1234 567 890', atasNama: 'Rani Putri',
        diajukanPada: new Date(now.getTime() - 2 * 3600_000),
        tanggal: hariIni, jamMulai: 9, jamSelesai: 11, totalHarga: 240_000,
      },
    ],
    refund: [
      {
        id: 1, kode: 'FGO-1028', penyewa: 'Bima Ardiansyah', nominal: 120_000,
        alasan: 'Slot sudah dipakai penyewa lain saat pembayaran telat.', cara: 'manual',
        status: 'menunggu', referenceGateway: null, catatan: null, diputuskanPada: new Date(now.getTime() - 3600_000),
      },
    ],
  };
}

/** Semua pembayaran yang butuh keputusan admin + antrean pembatalan + refund berjalan (FR-ADM-06/07). */
export async function getAntrianPembayaran(now = new Date()): Promise<AntrianPembayaran> {
  if (DEMO) return demoAntrian(now);

  const [tinjauRows, pendingRows, batalRows, refundRows] = await Promise.all([
    db.pembayaranGateway.findMany({
      where: { OR: [{ perluTinjau: true }, { status: 'perlu_tinjau' }] },
      orderBy: { dibuatPada: 'asc' },
      take: 100,
      select: {
        orderId: true, provider: true, jumlah: true, metode: true, dibayarPada: true, alasanTinjau: true,
        pesanan: {
          select: {
            kodePesanan: true, status: true, tanggalMain: true, jamMulai: true, jamSelesai: true,
            pengguna: { select: { nama: true } }, lapangan: { select: { nama: true } },
          },
        },
      },
    }),
    db.pembayaranGateway.findMany({
      where: { status: 'pending', kedaluwarsaPada: { lt: now } },
      orderBy: { dibuatPada: 'asc' },
      take: 100,
      select: {
        orderId: true, provider: true, jumlah: true, metode: true,
        pesanan: {
          select: {
            kodePesanan: true, status: true, tanggalMain: true, jamMulai: true, jamSelesai: true,
            pengguna: { select: { nama: true } }, lapangan: { select: { nama: true } },
          },
        },
      },
    }),
    db.pengajuanPembatalan.findMany({
      where: { status: 'menunggu' },
      orderBy: { diajukanPada: 'asc' },
      take: 100,
      select: {
        kontak: true, alasan: true, namaBank: true, nomorRekening: true, atasNama: true, diajukanPada: true,
        pesanan: {
          select: {
            kodePesanan: true, tanggalMain: true, jamMulai: true, jamSelesai: true, totalHarga: true,
            pengguna: { select: { nama: true } },
          },
        },
      },
    }),
    db.refund.findMany({
      where: { status: { not: 'berhasil' } },
      orderBy: { id: 'desc' },
      take: 100,
      select: {
        id: true, nominal: true, alasan: true, cara: true, status: true,
        referenceGateway: true, catatan: true, diputuskanPada: true,
        pesanan: { select: { kodePesanan: true, pengguna: { select: { nama: true } } } },
      },
    }),
  ]);

  const pengecualian: BarisPengecualian[] = [
    ...tinjauRows.map((t): BarisPengecualian => ({
      orderId: t.orderId,
      kode: t.pesanan.kodePesanan,
      penyewa: t.pesanan.pengguna.nama,
      lapanganNama: t.pesanan.lapangan.nama,
      tanggal: tanggal(t.pesanan.tanggalMain),
      jamMulai: t.pesanan.jamMulai,
      jamSelesai: t.pesanan.jamSelesai,
      jumlah: t.jumlah,
      metode: t.metode,
      dibayarPada: t.dibayarPada,
      alasan: t.alasanTinjau ?? 'PERLU_TINJAU',
      provider: t.provider,
      statusPesanan: t.pesanan.status,
      jenis: 'tinjau',
    })),
    ...pendingRows.map((t): BarisPengecualian => ({
      orderId: t.orderId,
      kode: t.pesanan.kodePesanan,
      penyewa: t.pesanan.pengguna.nama,
      lapanganNama: t.pesanan.lapangan.nama,
      tanggal: tanggal(t.pesanan.tanggalMain),
      jamMulai: t.pesanan.jamMulai,
      jamSelesai: t.pesanan.jamSelesai,
      jumlah: t.jumlah,
      metode: t.metode,
      dibayarPada: null,
      alasan: 'TRANSAKSI_PENDING_LEWAT_BATAS',
      provider: t.provider,
      statusPesanan: t.pesanan.status,
      jenis: 'pending',
    })),
  ];

  return {
    pengecualian,
    pembatalan: batalRows.map((b) => ({
      kode: b.pesanan.kodePesanan,
      penyewa: b.pesanan.pengguna.nama,
      kontak: b.kontak,
      alasan: b.alasan,
      namaBank: b.namaBank,
      nomorRekening: b.nomorRekening,
      atasNama: b.atasNama,
      diajukanPada: b.diajukanPada,
      tanggal: tanggal(b.pesanan.tanggalMain),
      jamMulai: b.pesanan.jamMulai,
      jamSelesai: b.pesanan.jamSelesai,
      totalHarga: b.pesanan.totalHarga,
    })),
    refund: refundRows.map((r) => ({
      id: r.id,
      kode: r.pesanan.kodePesanan,
      penyewa: r.pesanan.pengguna.nama,
      nominal: r.nominal,
      alasan: r.alasan,
      cara: r.cara === 'gateway' ? 'gateway' : 'manual',
      status: r.status as BarisRefund['status'],
      referenceGateway: r.referenceGateway,
      catatan: r.catatan,
      diputuskanPada: r.diputuskanPada,
    })),
  };
}
