import type { Metadata } from 'next';
import { RiwayatView } from '@/components/riwayat/RiwayatView';
import { DEMO_PENGGUNA } from '@/lib/demo';
import { getRiwayat } from '@/lib/demo-fe';
import type { StatusPesanan } from '@/lib/slots';

export const metadata: Metadata = { title: 'Gelanggang — Riwayat' };
export const dynamic = 'force-dynamic'; // status pesanan harus selalu terbaru

// FE dulu: data dummy dari lib/demo-fe.ts tanpa guard sesi. Saat backend riwayat jadi (FR-HIS-02),
// ganti dengan wajibPenyewa('/riwayat') + loader DB yang terikat id pengguna sesi (PRD 17.4).
const SAH: StatusPesanan[] = [
  'menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan',
  'selesai', 'dibatalkan', 'ditolak', 'kedaluwarsa',
];

export default async function Riwayat({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const raw = (await searchParams).status;
  const status = typeof raw === 'string' && (SAH as string[]).includes(raw) ? (raw as StatusPesanan) : 'semua';
  const daftar = getRiwayat();
  return (
    <RiwayatView
      pengguna={{ nama: DEMO_PENGGUNA.nama }}
      terverifikasi={DEMO_PENGGUNA.emailTerverifikasiPada !== null}
      daftar={daftar}
      statusAktif={status} />
  );
}
