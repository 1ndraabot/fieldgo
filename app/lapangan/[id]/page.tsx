import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LapanganView } from '@/components/lapangan/LapanganView';
import { penggunaSaatIni } from '@/lib/auth/session';
import { batasiTanggal, MAKS_HARI_MUKA, wibSekarang } from '@/lib/format';
import { getHalamanLapangan } from '@/lib/lapangan-data';
import { parseBerandaParams } from '@/lib/params';

export const metadata: Metadata = { title: 'FieldGo — Detail lapangan' };
export const dynamic = 'force-dynamic'; // status slot harus selalu terbaru (PRD Bagian 6)

const ID = /^\d{1,4}$/;

/** Detail lapangan + kalender slot dari basis data (FR-PUB-03/04), dengan fallback data contoh bila tanpa DATABASE_URL. */
export default async function DetailLapangan({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tanggal?: string | string[] }>;
}) {
  const { id } = await params;
  if (!ID.test(id)) notFound();

  const now = new Date();
  const hariIni = wibSekarang(now).tanggal;
  const { tanggal: diminta } = parseBerandaParams({ tanggal: (await searchParams).tanggal }, hariIni);
  // Pemesanan dibatasi [hari ini, hari ini + 30] — dijaga di server, kalender klien, dan API slot.
  const tanggal = batasiTanggal(diminta, hariIni, MAKS_HARI_MUKA);
  const [halaman, pengguna] = await Promise.all([getHalamanLapangan(Number(id), tanggal, now), penggunaSaatIni()]);
  if (!halaman) notFound();

  return (
    <LapanganView data={halaman.data} slot={halaman.slot} tanggal={tanggal} hariIni={hariIni}
      pengguna={pengguna ? { nama: pengguna.nama } : null} />
  );
}
