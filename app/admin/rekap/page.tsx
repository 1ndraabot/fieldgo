import type { Metadata } from 'next';
import { RekapView } from '@/components/admin/RekapView';
import { getAdminRekap } from '@/lib/demo-fe';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Rekap' };

// FE dulu: data dummy. Agregasi dari basis data (FR-ADM-09) menyusul.
export default async function AdminRekap() {
  await wajibAdmin('/admin/rekap');
  const { periodeLabel, baris } = getAdminRekap();
  return <RekapView periodeLabel={periodeLabel} baris={baris} />;
}
