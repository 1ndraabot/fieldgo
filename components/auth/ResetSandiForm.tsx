'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Banner, Field, Judul, PasswordInput, TombolUtama } from '@/components/auth/ui';
import { validasiReset } from '@/lib/auth/rules';

const MIN_SANDI = 8;

/** Form kata sandi baru (FR-ACC-04): POST nyata dengan token dari tautan email. Token dipakai sekali. */
export function ResetSandiForm({ token }: { token: string }) {
  const [sandi, setSandi] = useState('');
  const [ulang, setUlang] = useState('');
  const [galatSandi, setGalatSandi] = useState('');
  const [galatUlang, setGalatUlang] = useState('');
  const [umum, setUmum] = useState('');
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);

  async function simpan(e: FormEvent) {
    e.preventDefault();
    let g1 = '', g2 = '';
    if (sandi.length < MIN_SANDI) g1 = `Kata sandi minimal ${MIN_SANDI} karakter.`;
    if (ulang !== sandi) g2 = 'Konfirmasi tidak sama dengan kata sandi baru.';
    setGalatSandi(g1); setGalatUlang(g2); setUmum('');
    if (g1 || g2) return;
    setKirim(true);
    try {
      const res = await fetch('/api/auth/reset-sandi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, kataSandi: sandi }) });
      const b = await res.json();
      if (b.ok) setSukses(true);
      else if (b.kode === 'VALIDASI' && b.galat?.kataSandi) setGalatSandi(b.galat.kataSandi);
      else if (b.kode === 'TAUTAN_TIDAK_VALID') setUmum('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.');
      else if (b.kode === 'DIBATASI') setUmum('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
      else setUmum('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } catch {
      setUmum('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-5">
        <Banner nada="teal" ikon="check" role="status">Kata sandi berhasil diubah. Semua sesi lama dikeluarkan — silakan masuk dengan kata sandi baru.</Banner>
        <Link href="/masuk" className="btn flex h-14 w-full items-center justify-center rounded-full border-[1.5px] border-ink bg-white text-base font-bold no-underline">
          Masuk sekarang
        </Link>
      </div>
    );
  }

  if (umum === 'Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.') {
    return (
      <div className="flex flex-col gap-5">
        <Banner nada="merah" ikon="alert" role="alert">{umum}</Banner>
        <Link href="/lupa-sandi" className="btn flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-bold text-white no-underline">
          Minta tautan reset
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-5">
      <Judul kata="Atur kata sandi" hijau="baru.">
        Buat kata sandi yang kuat dan belum pernah kamu pakai di situs lain.
      </Judul>
      {umum && <Banner nada="merah" ikon="alert" role="alert">{umum}</Banner>}
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
