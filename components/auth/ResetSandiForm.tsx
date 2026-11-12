'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Banner, Field, Judul, PasswordInput, TombolUtama } from '@/components/auth/ui';

const MIN_SANDI = 8;

/** Form kata sandi baru (FR-ACC-04). FE dulu: pemanggilan API reset menyusul; token dipakai sekali. */
export function ResetSandiForm() {
  const [sandi, setSandi] = useState('');
  const [ulang, setUlang] = useState('');
  const [galatSandi, setGalatSandi] = useState('');
  const [galatUlang, setGalatUlang] = useState('');
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);

  function simpan(e: FormEvent) {
    e.preventDefault();
    let g1 = '', g2 = '';
    if (sandi.length < MIN_SANDI) g1 = `Kata sandi minimal ${MIN_SANDI} karakter.`;
    if (ulang !== sandi) g2 = 'Konfirmasi tidak sama dengan kata sandi baru.';
    setGalatSandi(g1); setGalatUlang(g2);
    if (g1 || g2) return;
    setKirim(true);
    // FE dulu: POST /api/auth/reset-sandi menyusul; token divalidasi server (sekali pakai).
    setTimeout(() => { setKirim(false); setSukses(true); }, 600);
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-5">
        <Banner nada="teal" ikon="check" role="status">Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.</Banner>
        <Link href="/masuk" className="btn flex h-14 w-full items-center justify-center rounded-full border-[1.5px] border-ink bg-white text-base font-bold no-underline">
          Masuk sekarang
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-5">
      <Judul kata="Atur kata sandi" hijau="baru.">
        Buat kata sandi yang kuat dan belum pernah kamu pakai di situs lain.
      </Judul>
      <Field id="sandi" label="Kata sandi baru" galat={galatSandi}>
        <PasswordInput id="sandi" value={sandi} onChange={(v) => { setSandi(v); setGalatSandi(''); }}
          autoComplete="new-password" placeholder="Minimal 8 karakter" galat={galatSandi} />
      </Field>
      <Field id="ulang" label="Ulangi kata sandi baru" galat={galatUlang}>
        <PasswordInput id="ulang" value={ulang} onChange={(v) => { setUlang(v); setGalatUlang(''); }}
          autoComplete="new-password" placeholder="Ulangi kata sandi" galat={galatUlang} />
      </Field>
      <TombolUtama disabled={kirim}>{kirim ? 'Menyimpan…' : 'Simpan kata sandi baru'}</TombolUtama>
    </form>
  );
}
