'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@/components/auth/ui';
import { labelHasilSinkron } from '@/lib/admin/pengecualian/rules';
import { kirimApi } from './api';

/** Tombol tarik-status: minta server mengambil status terakhir dari gateway lalu memprosesnya seperti webhook (FR-PAY-06). */
export function SinkronPembayaran({ kode }: { kode: string }) {
  const router = useRouter();
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  async function sinkronkan() {
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/pembayaran/${kode}/sinkron`, 'POST');
    setKirim(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Sinkronisasi gagal.' });
      return;
    }
    setPesan({ nada: 'teal', teks: labelHasilSinkron(String(h.data ?? '')) });
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={sinkronkan} disabled={kirim} aria-label={`Sinkronkan status pembayaran ${kode}`}
        className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold disabled:opacity-60">
        {kirim ? 'Menarik status…' : 'Sinkronkan dengan gateway'}
      </button>
      {pesan && <div className="mt-3"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}
    </div>
  );
}
