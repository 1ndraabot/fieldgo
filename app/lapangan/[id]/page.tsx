import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LapanganView } from '@/components/lapangan/LapanganView';
import { getLapanganDetail } from '@/lib/demo-fe';
import { tambahHari, wibSekarang } from '@/lib/format';
import { parseBerandaParams } from '@/lib/params';
import { computeSlotStatuses } from '@/lib/slots';

export const metadata: Metadata = { title: 'Gelanggang — Detail lapangan' };
export const dynamic = 'force-dynamic'; // status slot harus selalu terbaru (PRD Bagian 6)

const ID = /^\d{1,4}$/;

// TODO(belakang): ganti getLapanganDetail dengan loader basis data + cek lapangan aktif (FR-PUB-03).
export default async function DetailLapangan({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tanggal?: string | string[] }>;
}) {
  const { id } = await params;
  if (!ID.test(id)) notFound();
  const data = getLapanganDetail(Number(id));
  if (!data) notFound();

  const now = new Date();
  const hariIni = wibSekarang(now).tanggal;
  const { tanggal } = parseBerandaParams({ tanggal: (await searchParams).tanggal }, hariIni);
  const slot = computeSlotStatuses({
    tanggal, now, lapanganAktif: true, jamOperasional: data.jamOperasional, tarif: data.tarif,
    blokir: [], slotAktif: data.slotAktif,
  });

  // Navigasi tanggal: mundur hanya sampai hari ini, maju maksimal 13 hari.
  const sebelum = tambahHari(tanggal, -1);
  const sesud = tambahHari(tanggal, 1);
  return (
    <LapanganView data={data} slot={slot} tanggal={tanggal} hariIni={hariIni}
      hrefSebelum={sebelum >= hariIni ? `/lapangan/${data.id}?tanggal=${sebelum}` : null}
      hrefSesud={sesud <= tambahHari(hariIni, 13) ? `/lapangan/${data.id}?tanggal=${sesud}` : null} />
  );
}
