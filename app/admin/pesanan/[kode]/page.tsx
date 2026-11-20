import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DetailPesananAdminView } from '@/components/admin/DetailPesananAdminView';
import { getDetailPesananAdmin, kodeSah } from '@/lib/admin/pesanan/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Detail pesanan' };

// Detail pesanan admin (FR-ADM-08): kode tidak sah atau pesanan tidak ada → 404.
export default async function DetailPesananAdmin({ params }: { params: Promise<{ kode: string }> }) {
  await wajibAdmin('/admin/pesanan');
  const kode = decodeURIComponent((await params).kode);
  if (!kodeSah(kode)) notFound();
  const pesanan = await getDetailPesananAdmin(kode);
  if (!pesanan) notFound();
  return <DetailPesananAdminView pesanan={pesanan} />;
}
