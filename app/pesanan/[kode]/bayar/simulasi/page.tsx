import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { SimulasiPembayaran } from '@/components/pembayaran/SimulasiPembayaran';
import { wajibPenyewa } from '@/lib/auth/session';
import { getHalamanBayarGateway } from '@/lib/gateway/data';
import { simulasiAktif } from '@/lib/gateway/fake';

export const metadata: Metadata = { title: 'FieldGo — Simulasi pembayaran' };
export const dynamic = 'force-dynamic';

const KODE = /^[A-Za-z0-9-]{4,40}$/;

/** Hanya tersedia saat provider fake aktif (non-production). */
export default async function Simulasi({ params, searchParams }: {
  params: Promise<{ kode: string }>;
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  if (!simulasiAktif()) notFound();

  const { kode } = await params;
  if (!KODE.test(kode)) notFound();

  const raw = (await searchParams).order;
  const order = typeof raw === 'string' ? raw : '';
  if (!order) notFound();

  const pengguna = await wajibPenyewa(`/pesanan/${kode}/bayar/simulasi?order=${encodeURIComponent(order)}`);
  const data = await getHalamanBayarGateway(kode, pengguna.id);
  if (!data?.transaksi || data.transaksi.orderId !== order) notFound(); // bukan transaksi milik sesi ini

  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={{ nama: pengguna.nama }} aktif="Jadwal saya" />
      <main>
        <SimulasiPembayaran kode={data.kode} orderId={order} jumlah={data.totalHarga} />
      </main>
    </div>
  );
}
