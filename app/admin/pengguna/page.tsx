import type { Metadata } from 'next';
import { PenggunaView } from '@/components/admin/PenggunaView';
import { getDaftarPengguna } from '@/lib/admin/pengguna/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Pengguna' };
export const dynamic = 'force-dynamic'; // status pengguna berubah setelah aksi admin

export default async function AdminPengguna() {
  const admin = await wajibAdmin('/admin/pengguna');
  return <PenggunaView daftar={await getDaftarPengguna()} aktorId={admin.id} />;
}
