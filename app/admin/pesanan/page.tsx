import type { Metadata } from 'next';
import { DaftarPesananView } from '@/components/admin/DaftarPesananView';
import { getAdminPesanan } from '@/lib/demo-fe';
import type { StatusPesanan } from '@/lib/slots';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Pesanan' };

const SAH: StatusPesanan[] = [
  'menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan',
  'selesai', 'dibatalkan', 'ditolak', 'kedaluwarsa',
];

// FE dulu: data dummy. Filter status diproses server-side agar pola sama dengan backend nanti.
export default async function AdminPesanan({ searchParams }: { searchParams: Promise<{ q?: string | string[]; status?: string | string[] }> }) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const raw = typeof sp.status === 'string' ? sp.status : '';
  const status = (SAH as string[]).includes(raw) ? (raw as StatusPesanan) : 'semua';
  return <DaftarPesananView daftar={getAdminPesanan()} q={q} status={status} />;
}
