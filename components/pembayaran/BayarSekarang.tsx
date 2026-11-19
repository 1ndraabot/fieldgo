'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@/components/auth/ui';
import { Icon } from '@/components/icons';

export function BayarSekarang({ kode, transaksi, gatewayAktif }: {
  kode: string;
  transaksi: { redirectUrl: string; status: string } | null;
  gatewayAktif: boolean;
}) {
  const router = useRouter();
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState('');
  const lanjut = transaksi?.status === 'pending';

  if (!gatewayAktif) {
    return (
      <Banner nada="amber" ikon="info" role="status">
        Pembayaran online sedang dinonaktifkan pengelola. Pesananmu tetap tersimpan — hubungi pengelola lapangan
        untuk menyelesaikan pembayaran.
      </Banner>
    );
  }

  async function bayar() {
    setKirim(true);
    setGalat('');
    try {
      const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/bayar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const b = await res.json() as { ok?: boolean; redirectUrl?: string; kode?: string };
      if (b.ok && b.redirectUrl) {
        window.location.assign(b.redirectUrl);
        return;
      }
      if (res.status === 401) {
        router.push(`/masuk?next=${encodeURIComponent(`/pesanan/${kode}/bayar`)}`);
        return;
      }
      if (b.kode === 'GATEWAY_NONAKTIF') setGalat('Pembayaran gateway belum diaktifkan. Hubungi pengelola lapangan.');
      else if (b.kode === 'MODE_DEMO') setGalat('Mode demo tanpa basis data: transaksi pembayaran tidak tersedia.');
      else if (b.kode === 'KEDALUWARSA') { setGalat('Batas bayar sudah lewat. Silakan pesan ulang.'); router.refresh(); }
      else if (b.kode === 'STATUS_BERUBAH') { setGalat('Status pesanan sudah berubah.'); router.refresh(); }
      else setGalat('Belum bisa membuat transaksi. Coba lagi sebentar lagi.');
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {galat && <Banner nada="merah" ikon="alert">{galat}</Banner>}
      <div className="flex flex-wrap items-center gap-3">
        {lanjut && (
          <a href={transaksi.redirectUrl}
            className="btn flex h-14 items-center gap-3 rounded-full bg-lime py-0 pl-7 pr-2.5 text-base font-bold text-ink no-underline">
            Lanjutkan pembayaran
            <span className="flex size-9 items-center justify-center rounded-full bg-ink"><Icon name="arrow" size={18} stroke="#C6F432" width={2.4} /></span>
          </a>
        )}
        <button type="button" onClick={bayar} disabled={kirim}
          className={`btn flex h-14 cursor-pointer items-center gap-3 rounded-full border-0 py-0 pl-7 pr-2.5 text-base font-bold disabled:cursor-not-allowed disabled:opacity-45 ${lanjut ? 'bg-white/10 text-white' : 'bg-lime text-ink'}`}>
          {kirim ? 'Menyiapkan…' : lanjut ? 'Buat tagihan baru' : 'Bayar sekarang'}
          <span className={`flex size-9 items-center justify-center rounded-full ${lanjut ? 'bg-white/15' : 'bg-ink'}`}>
            <Icon name="arrow" size={18} stroke={lanjut ? '#FFFFFF' : '#C6F432'} width={2.4} />
          </span>
        </button>
      </div>
      <p className="m-0 text-sm leading-relaxed text-white/70">
        Kamu akan diarahkan ke halaman pembayaran yang aman. Status pesanan diperbarui otomatis setelah pembayaran diterima.
      </p>
    </div>
  );
}
