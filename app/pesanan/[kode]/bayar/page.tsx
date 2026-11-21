import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PembayaranView } from '@/components/PembayaranView';
import { wajibPenyewa } from '@/lib/auth/session';
import { getHalamanBayar } from '@/lib/pembayaran/data';

export const metadata: Metadata = { title: 'Gelanggang — Pembayaran' };
export const dynamic = 'force-dynamic'; // batas bayar dan status harus selalu terbaru

const KODE = /^[A-Za-z0-9-]{4,40}$/;

export default async function Bayar({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  if (!KODE.test(kode)) notFound();
  const pengguna = await wajibPenyewa(`/pesanan/${kode}/bayar`); // tamu → /masuk lalu kembali ke sini
  const data = await getHalamanBayar(kode, pengguna.id); // hanya pesanan milik sesi ini
  if (!data) notFound(); // milik orang lain = tidak ada
  return <PembayaranView pengguna={{ nama: pengguna.nama }} data={data} now={new Date()} />;
}
