import type { Metadata } from 'next';
import { PengaturanView } from '@/components/admin/PengaturanView';
import { getAdminPengaturan } from '@/lib/demo-fe';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Pengaturan' };

// FE dulu: data dummy. Penyimpanan pengaturan sungguhan (FR-ADM-11) menyusul bersama backend.
export default async function AdminPengaturan() {
  await wajibAdmin('/admin/pengaturan');
  return <PengaturanView data={getAdminPengaturan()} />;
}
