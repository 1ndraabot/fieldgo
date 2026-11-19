import type { Metadata } from 'next';
import { PengaturanView } from '@/components/admin/PengaturanView';
import { bacaPengaturan } from '@/lib/admin/pengaturan/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Pengaturan' };
export const dynamic = 'force-dynamic'; // nilai terbaru setelah admin menyimpan

export default async function AdminPengaturan() {
  await wajibAdmin('/admin/pengaturan');
  return <PengaturanView data={await bacaPengaturan()} />;
}
