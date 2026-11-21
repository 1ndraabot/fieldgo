'use client';

import { useState, type FormEvent } from 'react';
import { Banner, Field, Judul, PasswordInput, TeksInput, TombolUtama } from '@/components/auth/ui';

/** Login admin terpisah (FR-ADM-01). FE dulu: autentikasi admin menyusul; penyewa tidak bisa masuk lewat form ini. */
export function AdminMasukForm() {
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState('');
  const [kirim, setKirim] = useState(false);

  function masuk(e: FormEvent) {
    e.preventDefault();
    if (!email || !sandi) { setGalat('Email dan kata sandi wajib diisi.'); return; }
    setGalat('');
    setKirim(true);
    // FE dulu: POST /api/auth/admin-masuk menyusul bersama sesi admin (FR-ADM-01).
    setTimeout(() => { setKirim(false); setGalat('Mode tampilan: autentikasi admin menyusul.'); }, 600);
  }

  return (
    <form onSubmit={masuk} noValidate className="flex flex-col gap-5">
      <Judul kata="Panel admin" hijau="masuk.">Login khusus pengelola. Akun penyewa tidak dapat masuk lewat halaman ini.</Judul>
      {galat && <Banner nada="amber" ikon="info" role="status">{galat}</Banner>}
      <Field id="email" label="Email admin">
        <TeksInput id="email" value={email} onChange={(v) => { setEmail(v); setGalat(''); }}
          autoComplete="email" placeholder="admin@contoh.id" type="email" />
      </Field>
      <Field id="sandi" label="Kata sandi">
        <PasswordInput id="sandi" value={sandi} onChange={(v) => { setSandi(v); setGalat(''); }}
          autoComplete="current-password" placeholder="Kata sandi admin" />
      </Field>
      <TombolUtama disabled={kirim}>{kirim ? 'Memeriksa…' : 'Masuk sebagai admin'}</TombolUtama>
    </form>
  );
}
