import type { Metadata } from 'next';
import { PenggunaView } from '@/components/admin/PenggunaView';
import { getAdminPengguna } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Pengguna' };

// FE dulu: data dummy. Aksi aktif/nonaktif (FR-ADM-10) menyusul dengan otorisasi admin di server.
export default function AdminPengguna() {
  return <PenggunaView daftar={getAdminPengguna()} />;
}
