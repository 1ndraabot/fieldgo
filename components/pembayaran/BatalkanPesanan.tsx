'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@/components/auth/ui';

/** Batalkan pesanan yang belum dibayar (BR-10). Slot langsung dilepas. */
export function BatalkanPesanan({ kode }: { kode: string }) {
  const router = useRouter();
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);

  async function batalkan() {
    setKirim(true);
    setGalat('');
    try {
      const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/batal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const b = await res.json() as { ok?: boolean; kode?: string };
      if (b.ok) {
        router.push('/jadwal-saya');
        router.refresh();
        return;
      }
      setKonfirmasi(false);
      if (b.kode === 'STATUS_BERUBAH' || b.kode === 'TIDAK_DITEMUKAN') {
        setGalat('Pesanan ini sudah tidak menunggu pembayaran.');
        router.refresh();
      } else {
        setGalat('Belum berhasil membatalkan. Coba lagi sebentar lagi.');
      }
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {galat && <Banner nada="merah" ikon="alert">{galat}</Banner>}
      {!konfirmasi ? (
        <button type="button" onClick={() => setKonfirmasi(true)} disabled={kirim}
          className="btn flex h-14 w-fit cursor-pointer items-center rounded-full border-[1.5px] border-[#B42328] bg-transparent px-7 text-base font-bold text-[#B42328] disabled:opacity-45">
          Batalkan pesanan
        </button>
      ) : (
        <div role="alertdialog" aria-label="Konfirmasi pembatalan"
          className="flex flex-wrap items-center gap-3 rounded-[24px] border-[1.5px] border-[#E5484D] bg-[#FDE4E5] px-5 py-3 text-[15px] font-semibold text-[#7A1519]">
          Batalkan pesanan? Slot akan dilepas.
          <button type="button" onClick={batalkan} disabled={kirim}
            className="cursor-pointer rounded-full border-0 bg-[#B42328] px-5 py-2 text-sm font-bold text-white disabled:opacity-45">
            Ya, batalkan
          </button>
          <button type="button" onClick={() => setKonfirmasi(false)}
            className="cursor-pointer rounded-full border-[1.5px] border-[#B42328] bg-transparent px-5 py-2 text-sm font-bold text-[#B42328]">
            Tidak
          </button>
        </div>
      )}
    </div>
  );
}
