'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function KeluarButton() {
  const router = useRouter();
  const [proses, setProses] = useState(false);
  async function keluar() {
    setProses(true);
    try {
      await fetch('/api/auth/keluar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    } finally {
      setProses(false);
      router.refresh(); // halaman terproteksi otomatis mengarahkan ke /masuk
    }
  }
  return (
    <button type="button" onClick={keluar} disabled={proses}
      className="btn cursor-pointer rounded-full border-[1.5px] border-ink bg-transparent px-6 py-[13px] text-[15px] font-bold disabled:opacity-45">
      Keluar
    </button>
  );
}
