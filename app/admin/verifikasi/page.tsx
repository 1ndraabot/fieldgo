import type { Metadata } from 'next';
import { VerifikasiView } from '@/components/admin/VerifikasiView';
import { getAdminVerifikasi } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Verifikasi' };

// FE dulu: data dummy. Aksi setujui/tolak sungguhan (FR-ADM-06/07) menyusul bersama transaksi backend.
export default async function AdminVerifikasi({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const raw = (await searchParams).tab;
  const tab = raw === 'batal' ? 'batal' : 'bukti';
  const { bukti, pembatalan } = getAdminVerifikasi();
  return <VerifikasiView tab={tab} bukti={bukti} pembatalan={pembatalan} />;
}
