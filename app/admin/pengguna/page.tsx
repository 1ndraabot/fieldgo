import type { Metadata } from 'next';
import { PenggunaView } from '@/components/admin/PenggunaView';
import { getAdminPengguna } from '@/lib/demo-fe';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Pengguna' };

// FE dulu: data dummy. Aksi aktif/nonaktif (FR-ADM-10) menyusul dengan otorisasi admin di server.
export default async function AdminPengguna() {
  await wajibAdmin('/admin/pengguna');
  return <PenggunaView daftar={getAdminPengguna()} />;
}
