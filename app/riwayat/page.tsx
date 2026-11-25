import type { Metadata } from 'next';
import { RiwayatView } from '@/components/riwayat/RiwayatView';
import { wajibPenyewa } from '@/lib/auth/session';
import { getRiwayat } from '@/lib/riwayat/data';
import type { StatusPesanan } from '@/lib/slots';

export const metadata: Metadata = { title: 'FieldGo — Riwayat' };
export const dynamic = 'force-dynamic'; // status pesanan harus selalu terbaru

const SAH: StatusPesanan[] = [
  'menunggu_pembayaran', 'terkonfirmasi', 'pengajuan_pembatalan', 'dibatalkan', 'kedaluwarsa',
];

export default async function Riwayat({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const pengguna = await wajibPenyewa('/riwayat'); // halaman khusus penyewa (FR-PUB-05)
  const raw = (await searchParams).status;
  const status = typeof raw === 'string' && (SAH as string[]).includes(raw) ? (raw as StatusPesanan) : 'semua';
  const daftar = await getRiwayat(pengguna.id); // hanya pesanan milik sesi ini (FR-HIS-02)
  return (
    <RiwayatView
      pengguna={{ nama: pengguna.nama }}
      terverifikasi={pengguna.emailTerverifikasiPada !== null}
      daftar={daftar}
      statusAktif={status} />
  );
}
