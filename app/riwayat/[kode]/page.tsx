import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PesananDetailView } from '@/components/riwayat/PesananDetailView';
import { DEMO_PENGGUNA } from '@/lib/demo';
import { getDetailPesanan } from '@/lib/demo-fe';
import { wibSekarang } from '@/lib/format';

export const metadata: Metadata = { title: 'Gelanggang — Detail pesanan' };
export const dynamic = 'force-dynamic';

const KODE = /^[A-Za-z0-9-]{4,40}$/;

// FE dulu: dummy tanpa guard. Saat backend jadi: wajibPenyewa() + getDetailPesanan(kode, pengguna.id) —
// pesanan milik orang lain = notFound() (PRD 17.4).
export default async function DetailPesanan({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  if (!KODE.test(kode)) notFound();
  const data = getDetailPesanan(kode);
  if (!data) notFound();

  // Batas pengajuan pembatalan: paling lambat 23.59 hari sebelum tanggal main (H-1, BR-12).
  const hariIni = wibSekarang(new Date()).tanggal;
  const bisaAjukanBatal = data.tanggal > hariIni; // FE dulu: H-1 penuh; perhitungan detik 23.59 di server menyusul

  return <PesananDetailView pengguna={{ nama: DEMO_PENGGUNA.nama }} data={data} bisaAjukanBatal={bisaAjukanBatal} />;
}
