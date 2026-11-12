import type { Metadata } from 'next';
import { KelolaLapanganView } from '@/components/admin/KelolaLapanganView';
import { getAdminLapangan } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Kelola lapangan' };

// FE dulu: data dummy. CRUD sungguhan (FR-ADM-02) menyusul dengan otorisasi admin di server (PRD 17.4).
export default function AdminLapangan() {
  return <KelolaLapanganView daftar={getAdminLapangan()} />;
}
