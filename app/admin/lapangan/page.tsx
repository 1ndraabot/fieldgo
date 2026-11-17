import type { Metadata } from 'next';
import { KelolaLapanganView } from '@/components/admin/KelolaLapanganView';
import { getAdminLapangan } from '@/lib/demo-fe';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Kelola lapangan' };

// FE dulu: data dummy. CRUD sungguhan (FR-ADM-02) menyusul dengan otorisasi admin di server (PRD 17.4).
export default async function AdminLapangan() {
  await wajibAdmin('/admin/lapangan');
  return <KelolaLapanganView daftar={getAdminLapangan()} />;
}
