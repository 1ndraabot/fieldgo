import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import {
  getAdminJamOperasional, getAdminLapangan, getAdminTarif, getLapanganDetail,
} from '../../demo-fe.ts';
import { wibSekarang } from '../../format.ts';
import type { AturanTarif, BarisJam } from './rules.ts';

export type BarisLapanganAdmin = {
  id: number;
  nama: string;
  olahraga: string;
  jenisOlahragaId: number;
  hargaMulai: number;
  aktif: boolean;
  jumlahPesananMendatang: number;
};

export type LapanganEdit = {
  id: number;
  nama: string;
  jenisOlahragaId: number;
  deskripsi: string | null;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
  aktif: boolean;
  fasilitasIds: number[];
};

export type MasterItem = { id: number; nama: string; jumlahLapangan: number };
export type MasterLapangan = { jenis: MasterItem[]; fasilitas: MasterItem[] };

export type HalamanTarif = { lapanganNama: string; aturan: AturanTarif[]; jam: BarisJam[] };
export type HalamanJam = { lapanganNama: string; baris: BarisJam[]; tarif: AturanTarif[] };

const STATUS_AKTIF = ['menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan'] as const;

const hariIniWib = (now = new Date()): Date => {
  const t = wibSekarang(now).tanggal;
  return new Date(`${t}T00:00:00.000Z`);
};

export async function getDaftarLapangan(now = new Date()): Promise<BarisLapanganAdmin[]> {
  if (DEMO) {
    return getAdminLapangan().map((l, i) => ({
      ...l, jenisOlahragaId: i + 1, jumlahPesananMendatang: 0,
    }));
  }

  const rows = await db.lapangan.findMany({
    orderBy: { nama: 'asc' },
    select: {
      id: true, nama: true, aktif: true, jenisOlahragaId: true,
      jenisOlahraga: { select: { nama: true } },
      tarif: { select: { hargaPerJam: true } },
      _count: {
        select: {
          pesanan: { where: { status: { in: [...STATUS_AKTIF] }, tanggalMain: { gte: hariIniWib(now) } } },
        },
      },
    },
  });

  return rows.map((l) => ({
    id: l.id,
    nama: l.nama,
    olahraga: l.jenisOlahraga.nama,
    jenisOlahragaId: l.jenisOlahragaId,
    hargaMulai: l.tarif.length ? Math.min(...l.tarif.map((t) => t.hargaPerJam)) : 0,
    aktif: l.aktif,
    jumlahPesananMendatang: l._count.pesanan,
  }));
}

export async function getLapanganEdit(id: number): Promise<LapanganEdit | null> {
  if (DEMO) {
    const d = getLapanganDetail(id);
    const ringkas = getAdminLapangan().find((l) => l.id === id);
    if (!d || !ringkas) return null;
    return {
      id, nama: d.nama, jenisOlahragaId: id, deskripsi: d.deskripsi, alamat: d.alamat,
      latitude: null, longitude: null, aktif: ringkas.aktif, fasilitasIds: [],
    };
  }

  const l = await db.lapangan.findUnique({
    where: { id },
    select: {
      id: true, nama: true, jenisOlahragaId: true, deskripsi: true, alamat: true,
      latitude: true, longitude: true, aktif: true,
      fasilitas: { select: { fasilitasId: true } },
    },
  });
  if (!l) return null;
  return {
    id: l.id,
    nama: l.nama,
    jenisOlahragaId: l.jenisOlahragaId,
    deskripsi: l.deskripsi,
    alamat: l.alamat,
    latitude: l.latitude === null ? null : Number(l.latitude),
    longitude: l.longitude === null ? null : Number(l.longitude),
    aktif: l.aktif,
    fasilitasIds: l.fasilitas.map((f) => f.fasilitasId),
  };
}

export async function getMasterLapangan(): Promise<MasterLapangan> {
  if (DEMO) {
    const lapangan = getAdminLapangan();
    const jenis = [...new Set(lapangan.map((l) => l.olahraga))].map((nama, i) => ({
      id: i + 1, nama, jumlahLapangan: lapangan.filter((l) => l.olahraga === nama).length,
    }));
    return { jenis, fasilitas: [] };
  }

  const [jenis, fasilitas] = await Promise.all([
    db.jenisOlahraga.findMany({
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, _count: { select: { lapangan: true } } },
    }),
    db.fasilitas.findMany({
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, _count: { select: { lapangan: true } } },
    }),
  ]);

  return {
    jenis: jenis.map((j) => ({ id: j.id, nama: j.nama, jumlahLapangan: j._count.lapangan })),
    fasilitas: fasilitas.map((f) => ({ id: f.id, nama: f.nama, jumlahLapangan: f._count.lapangan })),
  };
}

export async function getHalamanTarif(id: number): Promise<HalamanTarif | null> {
  if (DEMO) {
    const d = getAdminTarif(id);
    const j = getAdminJamOperasional(id);
    return d && j ? { lapanganNama: d.lapanganNama, aturan: d.aturan, jam: j.baris } : null;
  }

  const l = await db.lapangan.findUnique({
    where: { id },
    select: { nama: true, tarif: true, jamOperasional: true },
  });
  if (!l) return null;
  return { lapanganNama: l.nama, aturan: l.tarif, jam: l.jamOperasional };
}

export async function getHalamanJam(id: number): Promise<HalamanJam | null> {
  if (DEMO) {
    const d = getAdminJamOperasional(id);
    const t = getAdminTarif(id);
    return d && t ? { lapanganNama: d.lapanganNama, baris: d.baris, tarif: t.aturan } : null;
  }

  const l = await db.lapangan.findUnique({
    where: { id },
    select: { nama: true, tarif: true, jamOperasional: true },
  });
  if (!l) return null;
  return { lapanganNama: l.nama, baris: l.jamOperasional, tarif: l.tarif };
}
