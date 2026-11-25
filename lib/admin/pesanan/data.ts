import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import type { BarisAdminPesanan } from '../../demo-fe.ts';
import { statusTampil } from '../../riwayat/rules.ts';
import type { StatusPesanan } from '../../slots.ts';

export const PER_HALAMAN = 50;

/** Kode pesanan aman untuk URL/kueri: huruf, angka, dan tanda hubung. */
export const kodeSah = (kode: string): boolean => /^[A-Za-z0-9-]{4,40}$/.test(kode);

export type DaftarPesananAdmin = {
  baris: BarisAdminPesanan[];
  total: number;
  halaman: number;
  totalHalaman: number;
};

const tanggalDari = (d: Date) => d.toISOString().slice(0, 10);

/** Cari berdasarkan kode pesanan, nama penyewa, atau nama lapangan (tanpa peduli huruf besar). */
const cocok = (b: BarisAdminPesanan, q: string): boolean =>
  [b.kode, b.penyewa, b.lapanganNama].some((t) => t.toLowerCase().includes(q));

/** Daftar pesanan untuk panel admin: cari + filter status + pagination 50/halaman (FR-ADM-08). */
export async function getDaftarPesanan(
  i: { q?: string; status?: StatusPesanan | 'semua'; halaman?: number },
  now = new Date(),
): Promise<DaftarPesananAdmin> {
  const q = (i.q ?? '').trim().toLowerCase();
  const status = i.status ?? 'semua';
  const halaman = Math.max(1, Math.floor(i.halaman ?? 1));

  if (DEMO) {
    // Tanpa database: sintesis dari data demo FE.
    const semua = (await import('../../demo-fe.ts')).getAdminPesanan(now)
      .map((b) => ({ ...b, status: statusTampil(b.status, b.batasBayarPada, now) }))
      .filter((b) => (q ? cocok(b, q) : true))
      .filter((b) => (status === 'semua' ? true : b.status === status));
    const total = semua.length;
    const totalHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
    const mulai = (halaman - 1) * PER_HALAMAN;
    return { baris: semua.slice(mulai, mulai + PER_HALAMAN), total, halaman, totalHalaman };
  }

  const where = {
    ...(q
      ? {
          OR: [
            { kodePesanan: { contains: q, mode: 'insensitive' as const } },
            { pengguna: { nama: { contains: q, mode: 'insensitive' as const } } },
            { lapangan: { nama: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
    ...(status === 'semua' ? {} : { status }),
  };

  const [rows, total] = await Promise.all([
    db.pesanan.findMany({
      where,
      orderBy: [{ dibuatPada: 'desc' }, { id: 'desc' }],
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      select: {
        kodePesanan: true, lapanganId: true, tanggalMain: true, jamMulai: true, jamSelesai: true,
        jumlahJam: true, totalHarga: true, status: true, dibuatPada: true, batasBayarPada: true,
        alasanPenolakan: true,
        pengguna: { select: { nama: true } },
        lapangan: { select: { nama: true } },
      },
    }),
    db.pesanan.count({ where }),
  ]);

  return {
    baris: rows.map((r) => ({
      kode: r.kodePesanan, lapanganId: r.lapanganId, lapanganNama: r.lapangan.nama,
      penyewa: r.pengguna.nama,
      tanggal: tanggalDari(r.tanggalMain), jamMulai: r.jamMulai, jamSelesai: r.jamSelesai, jumlahJam: r.jumlahJam,
      totalHarga: r.totalHarga, status: statusTampil(r.status, r.batasBayarPada, now),
      dibuatPada: r.dibuatPada, batasBayarPada: r.batasBayarPada, alasanPenolakan: r.alasanPenolakan,
    })),
    total,
    halaman,
    totalHalaman: Math.max(1, Math.ceil(total / PER_HALAMAN)),
  };
}

export type PembayaranGatewayBaris = {
  id: number;
  orderId: string;
  provider: string;
  status: string;
  jumlah: number;
  metode: string | null;
  perluTinjau: boolean;
  alasanTinjau: string | null;
  dibuatPada: Date;
  kedaluwarsaPada: Date | null;
  dibayarPada: Date | null;
};

export type RefundBaris = {
  id: number;
  nominal: number;
  alasan: string;
  cara: 'gateway' | 'manual';
  status: 'menunggu' | 'diproses' | 'berhasil' | 'gagal';
  referenceGateway: string | null;
  catatan: string | null;
  diputuskanPada: Date | null;
  selesaiPada: Date | null;
};

export type DetailPesananAdmin = BarisAdminPesanan & {
  email: string;
  slot: { jam: number; hargaPerJam: number }[];
  pembayaranGateway: PembayaranGatewayBaris[];
  refund: RefundBaris[];
  pengajuanBatal: {
    kontak: string;
    alasan: string;
    namaBank: string;
    nomorRekening: string;
    atasNama: string;
    keadaan: 'menunggu' | 'disetujui' | 'ditolak';
    catatanAdmin: string | null;
    nominalRefund: number | null;
    diajukanPada: Date;
    diputuskanPada: Date | null;
  } | null;
  riwayat: { waktu: Date; statusBaru: StatusPesanan; oleh: string; catatan: string | null }[];
};

/** Detail pesanan versi admin: slot, semua percobaan gateway, refund, pengajuan batal, linimasa (FR-ADM-08). */
export async function getDetailPesananAdmin(kode: string, now = new Date()): Promise<DetailPesananAdmin | null> {
  if (!kodeSah(kode)) return null;

  if (DEMO) {
    const semuanya = (await import('../../demo-fe.ts')).getAdminPesanan(now);
    const b = semuanya.find((x) => x.kode === kode);
    if (!b) return null;
    const slot = Array.from({ length: b.jamSelesai - b.jamMulai }, (_, i) => ({
      jam: b.jamMulai + i,
      hargaPerJam: Math.round(b.totalHarga / b.jumlahJam),
    }));
    return {
      ...b, email: 'penyewa@contoh.id', slot,
      pembayaranGateway: [], refund: [], pengajuanBatal: null,
      riwayat: [{ waktu: b.dibuatPada, statusBaru: b.status, oleh: 'Sistem', catatan: 'Data demo — tanpa basis data.' }],
    };
  }

  const p = await db.pesanan.findUnique({
    where: { kodePesanan: kode },
    select: {
      id: true, kodePesanan: true, lapanganId: true, tanggalMain: true, jamMulai: true, jamSelesai: true,
      jumlahJam: true, totalHarga: true, status: true, dibuatPada: true, batasBayarPada: true,
      alasanPenolakan: true, penggunaId: true,
      pengguna: { select: { nama: true, email: true } },
      lapangan: { select: { nama: true } },
      slot: { orderBy: { jam: 'asc' }, select: { jam: true, hargaPerJam: true, aktif: true } },
      pembayaranGateway: {
        orderBy: { dibuatPada: 'desc' },
        select: {
          id: true, orderId: true, provider: true, status: true, jumlah: true, metode: true,
          perluTinjau: true, alasanTinjau: true, dibuatPada: true, kedaluwarsaPada: true, dibayarPada: true,
        },
      },
      refund: {
        orderBy: { id: 'desc' },
        select: {
          id: true, nominal: true, alasan: true, cara: true, status: true,
          referenceGateway: true, catatan: true, diputuskanPada: true, selesaiPada: true,
        },
      },
      pengajuanPembatalan: {
        select: {
          kontak: true, alasan: true, namaBank: true, nomorRekening: true, atasNama: true,
          status: true, catatanAdmin: true, nominalRefund: true, diajukanPada: true, diputuskanPada: true,
        },
      },
      riwayat: { orderBy: { waktu: 'asc' }, select: { statusBaru: true, diubahOleh: true, waktu: true, catatan: true } },
    },
  });
  if (!p) return null;

  return {
    kode: p.kodePesanan, lapanganId: p.lapanganId, lapanganNama: p.lapangan.nama,
    penyewa: p.pengguna.nama, email: p.pengguna.email,
    tanggal: tanggalDari(p.tanggalMain), jamMulai: p.jamMulai, jamSelesai: p.jamSelesai, jumlahJam: p.jumlahJam,
    totalHarga: p.totalHarga, status: statusTampil(p.status, p.batasBayarPada, now),
    dibuatPada: p.dibuatPada, batasBayarPada: p.batasBayarPada, alasanPenolakan: p.alasanPenolakan,
    slot: p.slot.filter((s) => s.aktif),
    pembayaranGateway: p.pembayaranGateway.map((t) => ({ ...t, status: String(t.status) })),
    refund: p.refund.map((r) => ({
      id: r.id, nominal: r.nominal, alasan: r.alasan,
      cara: r.cara === 'gateway' ? 'gateway' : 'manual',
      status: r.status as RefundBaris['status'],
      referenceGateway: r.referenceGateway, catatan: r.catatan, diputuskanPada: r.diputuskanPada, selesaiPada: r.selesaiPada,
    })),
    pengajuanBatal: p.pengajuanPembatalan && {
      kontak: p.pengajuanPembatalan.kontak, alasan: p.pengajuanPembatalan.alasan,
      namaBank: p.pengajuanPembatalan.namaBank, nomorRekening: p.pengajuanPembatalan.nomorRekening,
      atasNama: p.pengajuanPembatalan.atasNama,
      keadaan: p.pengajuanPembatalan.status,
      catatanAdmin: p.pengajuanPembatalan.catatanAdmin, nominalRefund: p.pengajuanPembatalan.nominalRefund,
      diajukanPada: p.pengajuanPembatalan.diajukanPada, diputuskanPada: p.pengajuanPembatalan.diputuskanPada,
    },
    riwayat: p.riwayat.map((e) => ({
      waktu: e.waktu, statusBaru: e.statusBaru,
      oleh: e.diubahOleh === null ? 'Sistem' : e.diubahOleh === p.penggunaId ? 'Penyewa' : 'Admin',
      catatan: e.catatan,
    })),
  };
}
