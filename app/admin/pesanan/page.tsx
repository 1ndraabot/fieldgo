import type { Metadata } from 'next';
import { DaftarPesananView } from '@/components/admin/DaftarPesananView';
import { getDaftarPesanan } from '@/lib/admin/pesanan/data';
import type { StatusPesanan } from '@/lib/slots';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Pesanan' };

const SAH: StatusPesanan[] = [
  'menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan',
  'selesai', 'dibatalkan', 'ditolak', 'kedaluwarsa',
];

// Daftar pesanan admin (FR-ADM-08): pencarian q + filter status + halaman, semuanya di server.
export default async function AdminPesanan({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[]; halaman?: string | string[] }>;
}) {
  await wajibAdmin('/admin/pesanan');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const raw = typeof sp.status === 'string' ? sp.status : '';
  const status = (SAH as string[]).includes(raw) ? (raw as StatusPesanan) : 'semua';
  const halaman = Number.parseInt(typeof sp.halaman === 'string' ? sp.halaman : '', 10);
  const data = await getDaftarPesanan({ q, status, halaman: Number.isInteger(halaman) && halaman > 0 ? halaman : 1 });
  return <DaftarPesananView data={data} q={q} status={status} />;
}
