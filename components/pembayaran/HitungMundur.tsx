'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const dua = (n: number) => String(n).padStart(2, '0');

/** Hitung mundur batas bayar (hh:mm:ss). Saat habis, memuat ulang halaman agar status kedaluwarsa tampil. */
export function HitungMundur({ target }: { target: string }) {
  const router = useRouter();
  const [sisa, setSisa] = useState<number | null>(null); // null sampai terpasang: hindari beda isi server vs browser

  useEffect(() => {
    const akhir = new Date(target).getTime();
    const tik = () => { const s = Math.max(0, Math.floor((akhir - Date.now()) / 1000)); setSisa(s); return s; };
    if (tik() === 0) { router.refresh(); return; }
    const id = setInterval(() => { if (tik() === 0) { clearInterval(id); router.refresh(); } }, 1000);
    return () => clearInterval(id);
  }, [target, router]);

  const s = sisa ?? 0;
  return (
    <span role="timer" aria-label="Sisa waktu bayar" className="tabular-nums">
      {sisa === null ? '--:--:--' : `${dua(Math.floor(s / 3600))}:${dua(Math.floor((s % 3600) / 60))}:${dua(s % 60)}`}
    </span>
  );
}
