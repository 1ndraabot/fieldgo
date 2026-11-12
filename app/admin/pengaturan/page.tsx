import type { Metadata } from 'next';
import { PengaturanView } from '@/components/admin/PengaturanView';
import { getAdminPengaturan } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Pengaturan' };

// FE dulu: data dummy. Penyimpanan pengaturan sungguhan (FR-ADM-11) menyusul bersama backend.
export default function AdminPengaturan() {
  return <PengaturanView data={getAdminPengaturan()} />;
}
