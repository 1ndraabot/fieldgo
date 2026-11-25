'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@/components/auth/ui';
import { Icon } from '@/components/icons';

type Aksi = 'dibayar' | 'gagal' | 'kedaluwarsa';

const PILIHAN: { aksi: Aksi; judul: string; keterangan: string; kelas: string }[] = [
  { aksi: 'dibayar', judul: 'Simulasikan pembayaran berhasil', keterangan: 'Pesanan langsung terkonfirmasi.', kelas: 'bg-brand text-white' },
  { aksi: 'gagal', judul: 'Simulasikan pembayaran gagal', keterangan: 'Transaksi ditandai gagal; kamu bisa mencoba lagi.', kelas: 'border-[1.5px] border-line bg-white text-ink' },
  { aksi: 'kedaluwarsa', judul: 'Simulasikan transaksi kedaluwarsa', keterangan: 'Slot dilepas dan pesanan kedaluwarsa.', kelas: 'border-[1.5px] border-[#B42328] bg-white text-[#B42328]' },
];

export function SimulasiPembayaran({ kode, orderId, jumlah }: { kode: string; orderId: string; jumlah: number }) {
  const router = useRouter();
  const [kirim, setKirim] = useState<Aksi | null>(null);
  const [galat, setGalat] = useState('');

  async function jalankan(aksi: Aksi) {
    setKirim(aksi);
    setGalat('');
    try {
      const res = await fetch('/api/gateway/fake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, status: aksi }),
      });
      const b = await res.json() as { ok?: boolean; hasil?: string };
      if (!res.ok || !b.ok) {
        setGalat('Simulasi gagal diproses. Pastikan GATEWAY_PROVIDER=fake dan server berjalan di mode development.');
        return;
      }
      router.push(`/pesanan/${encodeURIComponent(kode)}/bayar`);
      router.refresh();
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-[clamp(16px,4.5vw,32px)] py-16">
      <div className="rounded-[36px] border-[1.5px] border-dashed border-[#F5A524] bg-[#FFF8E8] p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF1D6] px-3.5 py-[7px] text-[13px] font-bold text-[#7A4B00]">
          <Icon name="info" size={14} stroke="#7A4B00" /> Mode simulasi
        </span>
        <h1 className="mt-4 font-display text-[clamp(30px,5vw,44px)] font-bold leading-[1.1] tracking-[-0.03em]">
          Simulasi <span className="text-brand-2">pembayaran</span>
        </h1>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-muted">
          Halaman ini menggantikan Xendit selama kredensial gateway belum tersedia.
          Tidak ada uang yang benar-benar dipindahkan.
        </p>
        <dl className="m-0 mt-6 grid gap-2.5 rounded-2xl bg-white/70 p-5 text-[15px]">
          <div className="flex justify-between gap-3"><dt className="font-medium text-muted">Kode pesanan</dt><dd className="m-0 font-bold">{kode}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-medium text-muted">Order ID gateway</dt><dd className="m-0 font-mono text-[13px] font-bold">{orderId}</dd></div>
          <div className="flex justify-between gap-3"><dt className="font-medium text-muted">Nominal</dt><dd className="m-0 font-bold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(jumlah)}</dd></div>
        </dl>

        {galat && <div className="mt-5"><Banner nada="merah" ikon="alert">{galat}</Banner></div>}

        <div className="mt-6 flex flex-col gap-3">
          {PILIHAN.map((p) => (
            <button key={p.aksi} type="button" onClick={() => jalankan(p.aksi)} disabled={kirim !== null}
              className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-2xl px-5 py-4 text-left text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-45 ${p.kelas}`}>
              {kirim === p.aksi ? 'Memproses…' : p.judul}
              <span className="text-[13px] font-medium opacity-75">{p.keterangan}</span>
            </button>
          ))}
        </div>

        <Link href={`/pesanan/${encodeURIComponent(kode)}/bayar`} className="mt-6 inline-block text-sm font-bold text-muted no-underline hover:text-brand">
          Kembali ke halaman pembayaran
        </Link>
      </div>
    </div>
  );
}
