import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PesananDetailView } from '@/components/riwayat/PesananDetailView';
import { bacaPengaturan } from '@/lib/admin/pengaturan/data';
import { wajibPenyewa } from '@/lib/auth/session';
import { getDetailPesanan } from '@/lib/riwayat/data';
import { bisaAjukanBatal } from '@/lib/riwayat/rules';

export const metadata: Metadata = { title: 'FieldGo — Detail pesanan' };
export const dynamic = 'force-dynamic';

const KODE = /^[A-Za-z0-9-]{4,40}$/;

export default async function DetailPesanan({ params }: { params: Promise<{ kode: string }> }) {
  const pengguna = await wajibPenyewa('/riwayat'); // halaman khusus penyewa (FR-PUB-05)
  const { kode } = await params;
  if (!KODE.test(kode)) notFound();
  const now = new Date();
  const data = await getDetailPesanan(kode, pengguna.id, now); // milik orang lain = tidak ada (PRD 17.4)
  if (!data) notFound();

  // Batas pengajuan pembatalan mengikuti Pengaturan (default H-1, BR-12).
  const bisaBatal = bisaAjukanBatal(data.status, data.tanggal, now, (await bacaPengaturan()).batasPembatalanHari);

  return <PesananDetailView pengguna={{ nama: pengguna.nama }} data={data} bisaAjukanBatal={bisaBatal} />;
}
