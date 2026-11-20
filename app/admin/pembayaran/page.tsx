import type { Metadata } from 'next';
import { PembayaranView } from '@/components/admin/PembayaranView';
import { getAntrianPembayaran } from '@/lib/admin/pengecualian/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Pembayaran' };

// Antrean pengecualian pembayaran, pengajuan batal, dan refund (FR-ADM-06/07).
export default async function AdminPembayaran({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  await wajibAdmin('/admin/pembayaran');
  const raw = (await searchParams).tab;
  const tab = raw === 'batal' || raw === 'refund' ? raw : 'pengecualian';
  const antrian = await getAntrianPembayaran();
  return <PembayaranView tab={tab} antrian={antrian} />;
}
