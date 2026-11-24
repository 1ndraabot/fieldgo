'use client';

import { useState } from 'react';

/** Tombol salin generik untuk nomor VA / string QR. */
export function SalinNomor({ nilai, label = 'Salin' }: { nilai: string; label?: string }) {
  const [tersalin, setTersalin] = useState(false);
  async function salin() {
    try {
      await navigator.clipboard.writeText(nilai);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch { /* tanpa izin clipboard: pengguna menyalin manual */ }
  }
  return (
    <button type="button" onClick={salin} aria-live="polite"
      className="btn flex h-11 cursor-pointer shrink-0 items-center gap-2 rounded-full bg-white/10 px-5 text-[14px] font-bold text-white disabled:opacity-60">
      {tersalin ? 'Tersalin ✓' : label}
    </button>
  );
}
