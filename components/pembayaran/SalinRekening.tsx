'use client';

import { useState } from 'react';

export function SalinRekening({ nomor }: { nomor: string }) {
  const [tersalin, setTersalin] = useState(false);
  async function salin() {
    try {
      await navigator.clipboard.writeText(nomor.replace(/\s/g, ''));
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch { /* tanpa izin clipboard: pengguna menyalin manual */ }
  }
  return (
    <button type="button" onClick={salin} aria-live="polite"
      className="btn flex h-[52px] cursor-pointer items-center rounded-full border-[1.5px] border-white/45 bg-transparent px-6 text-[15px] font-bold text-white">
      {tersalin ? 'Tersalin' : 'Salin nomor rekening'}
    </button>
  );
}
