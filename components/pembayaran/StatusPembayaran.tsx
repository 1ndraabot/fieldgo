'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Polling ringan selama pesanan masih menunggu pembayaran. Webhook tetap sumber
 * kebenaran; komponen ini hanya memuat ulang halaman saat status berubah.
 *
 * Callback gateway bisa telat atau gagal (mis. server lokal di balik tunnel). Karena itu
 * tiap ±15 detik server diminta menarik status langsung dari gateway lewat endpoint
 * sinkron yang idempoten dan dibatasi per pesanan.
 */
export function StatusPembayaran({ kode, aktif }: { kode: string; aktif: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!aktif) return;
    let berhenti = false;
    let tik = 0;

    function terapkan(b: { status?: string }) {
      if (!berhenti && b.status && b.status !== 'menunggu_pembayaran') {
        berhenti = true;
        router.refresh();
      }
    }

    async function periksa() {
      try {
        const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        terapkan(await res.json() as { status?: string });
      } catch {
        // diamkan; coba lagi pada interval berikutnya
      }
    }

    async function sinkron() {
      try {
        const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/sinkron`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
          cache: 'no-store',
        });
        if (!res.ok) return;
        terapkan(await res.json() as { status?: string });
      } catch {
        // diamkan; periksa status biasa tetap berjalan
      }
    }

    void sinkron();
    const id = setInterval(() => {
      tik += 1;
      void (tik % 3 === 0 ? sinkron() : periksa());
    }, 5000);
    return () => { berhenti = true; clearInterval(id); };
  }, [kode, aktif, router]);

  return null;
}
