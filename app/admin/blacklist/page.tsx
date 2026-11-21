import type { Metadata } from 'next';
import { BlacklistView } from '@/components/admin/BlacklistView';
import { getAdminBlacklist, getAdminLapangan } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Blacklist' };

// FE dulu: data dummy. Blokir + pembatalan otomatis pesanan terdampak (FR-ADM-05, AC-15) menyusul.
export default function AdminBlacklist() {
  const { baris, bentrokDemo } = getAdminBlacklist();
  return <BlacklistView daftarLapangan={getAdminLapangan().map((l) => ({ id: l.id, nama: l.nama }))} baris={baris} bentrokDemo={bentrokDemo} />;
}
