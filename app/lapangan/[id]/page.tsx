import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LapanganView } from '@/components/lapangan/LapanganView';
import { tambahHari, wibSekarang } from '@/lib/format';
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
  const { tanggal } = parseBerandaParams({ tanggal: (await searchParams).tanggal }, hariIni);
  const halaman = await getHalamanLapangan(Number(id), tanggal, now);
  if (!halaman) notFound();

  // Navigasi tanggal: mundur hanya sampai hari ini, maju maksimal 13 hari.
  const sebelum = tambahHari(tanggal, -1);
  const sesud = tambahHari(tanggal, 1);
  return (
    <LapanganView data={halaman.data} slot={halaman.slot} tanggal={tanggal} hariIni={hariIni}
      hrefSebelum={sebelum >= hariIni ? `/lapangan/${halaman.data.id}?tanggal=${sebelum}` : null}
      hrefSesud={sesud <= tambahHari(hariIni, 13) ? `/lapangan/${halaman.data.id}?tanggal=${sesud}` : null} />
  );
}
