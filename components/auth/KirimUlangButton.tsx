'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatHitungMundur } from '@/lib/format';

export function KirimUlangButton({ label = 'Kirim ulang tautan' }: { label?: string }) {
  const router = useRouter();
  const [tunggu, setTunggu] = useState(0);
  const [catatan, setCatatan] = useState('');
  const [kirim, setKirim] = useState(false);

  useEffect(() => {
    if (tunggu <= 0) return;
    const id = setTimeout(() => setTunggu((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tunggu]);

  async function klik() {
    setKirim(true);
    try {
      const res = await fetch('/api/auth/kirim-ulang', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const b = await res.json();
      if (b.ok && b.status === 'terkirim') { setCatatan('Tautan baru terkirim. Cek kotak masuk dan folder spam.'); setTunggu(60); }
      else if (b.ok) { setCatatan('Email kamu sudah terverifikasi.'); router.refresh(); }
      else if (b.kode === 'DIBATASI') setTunggu(b.ulangiDetik);
      else if (b.kode === 'TIDAK_LOGIN') router.push('/masuk?next=%2Fverifikasi-email');
      else setCatatan('Belum berhasil mengirim. Coba lagi sebentar lagi.');
    } catch {
      setCatatan('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  return (
    <>
      <div role="status" className="min-h-[22px] text-sm font-bold text-[#0A6B3A]">{catatan}</div>
      <button type="button" onClick={klik} disabled={kirim || tunggu > 0}
        className="btn flex h-14 w-full cursor-pointer items-center justify-center rounded-full border-0 bg-brand px-7 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
        {tunggu > 0 ? `Kirim ulang dalam ${formatHitungMundur(tunggu)}` : label}
      </button>
    </>
  );
}
