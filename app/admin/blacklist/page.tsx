import type { Metadata } from 'next';
import { BlacklistView } from '@/components/admin/BlacklistView';
import { getDaftarBlokir, getLapanganBlokir } from '@/lib/admin/blacklist/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Blacklist' };
export const dynamic = 'force-dynamic'; // daftar blokir dan pilihan lapangan harus terbaru

export default async function AdminBlacklist() {
  await wajibAdmin('/admin/blacklist');
  const [baris, daftarLapangan] = await Promise.all([getDaftarBlokir(), getLapanganBlokir()]);
  return <BlacklistView daftarLapangan={daftarLapangan} baris={baris} />;
}
