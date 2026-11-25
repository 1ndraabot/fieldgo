import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import { getAdminPengguna } from '../../demo-fe.ts';
import { labelDibuat } from '../../format.ts';
import type { PeranPengguna } from './rules.ts';

export type BarisPengguna = {
  id: number;
  nama: string;
  email: string;
  kontak: string;
  peran: PeranPengguna;
  aktif: boolean;
  terverifikasi: boolean;
  jumlahPesanan: number;
  gabung: string;
};

/** Semua pengguna terdaftar, terbaru lebih dulu. Admin ikut tampil tetapi tidak dapat dinonaktifkan. */
export async function getDaftarPengguna(): Promise<BarisPengguna[]> {
  if (DEMO) {
    return getAdminPengguna().map((u) => ({
      id: u.id,
      nama: u.nama,
      email: u.email,
      kontak: u.kontak,
      peran: 'penyewa' as const,
      aktif: u.aktif,
      terverifikasi: u.terverifikasi,
      jumlahPesanan: u.jumlahPesanan,
      gabung: u.gabung,
    }));
  }

  const rows = await db.pengguna.findMany({
    orderBy: { dibuatPada: 'desc' },
    select: {
      id: true, nama: true, email: true, nomorKontak: true, peran: true,
      emailTerverifikasiPada: true, dinonaktifkanPada: true, dibuatPada: true,
      _count: { select: { pesanan: true } },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    nama: u.nama,
    email: u.email,
    kontak: u.nomorKontak,
    peran: u.peran,
    aktif: u.dinonaktifkanPada === null,
    terverifikasi: u.emailTerverifikasiPada !== null,
    jumlahPesanan: u._count.pesanan,
    gabung: labelDibuat(u.dibuatPada),
  }));
}
