import type { Metadata } from 'next';
import { RekapView } from '@/components/admin/RekapView';
import { getAdminRekap } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Rekap' };

// FE dulu: data dummy. Agregasi dari basis data (FR-ADM-09) menyusul.
export default function AdminRekap() {
  const { periodeLabel, baris } = getAdminRekap();
  return <RekapView periodeLabel={periodeLabel} baris={baris} />;
}
