'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Polling ringan selama pesanan masih menunggu pembayaran. Webhook tetap sumber
 * kebenaran; komponen ini hanya memuat ulang halaman saat status berubah.
 */
export function StatusPembayaran({ kode, aktif }: { kode: string; aktif: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!aktif) return;
    let berhenti = false;

    async function cek() {
      try {
        const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const b = await res.json() as { status?: string };
        if (!berhenti && b.status && b.status !== 'menunggu_pembayaran') {
          berhenti = true;
          router.refresh();
        }
      } catch {
        // diamkan; coba lagi pada interval berikutnya
      }
    }

    void cek();
    const id = setInterval(cek, 5000);
    return () => { berhenti = true; clearInterval(id); };
  }, [kode, aktif, router]);

  return null;
}
