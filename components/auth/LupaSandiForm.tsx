'use client';

import { useState, type FormEvent } from 'react';
import { Banner, Field, Judul, TeksInput, TombolUtama } from '@/components/auth/ui';
import { Icon } from '@/components/icons';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Form lupa kata sandi (FR-ACC-04). FE dulu: pemanggilan API reset menyusul; tautan berlaku 24 jam, sekali pakai. */
export function LupaSandiForm() {
  const [email, setEmail] = useState('');
  const [galat, setGalat] = useState('');
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);

  function kirimTautan(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email)) { setGalat('Masukkan alamat email yang valid.'); return; }
    setGalat('');
    setKirim(true);
    // FE dulu: POST /api/auth/lupa-sandi menyusul bersama backend reset (PRD FR-ACC-04).
    setTimeout(() => { setKirim(false); setSukses(true); }, 600);
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-5">
        <Banner nada="teal" ikon="mail" role="status">
          Bila email terdaftar, tautan reset sudah dikirim ke <strong>{email}</strong>. Tautan berlaku 24 jam dan sekali pakai.
        </Banner>
        <p className="text-[13px] font-medium text-muted">Periksa folder spam bila tidak diterima dalam 5 menit.</p>
      </div>
    );
  }

  return (
    <form onSubmit={kirimTautan} noValidate className="flex flex-col gap-5">
      <Judul kata="Lupa kata sandi?" hijau="pulihkan aksesmu.">
        Masukkan email akunmu. Kami kirim tautan untuk mengatur kata sandi baru.
      </Judul>
      <Field id="email" label="Email terdaftar" galat={galat}>
        <TeksInput id="email" value={email} onChange={(v) => { setEmail(v); setGalat(''); }}
          autoComplete="email" placeholder="nama@contoh.id" type="email" galat={galat} />
      </Field>
      <TombolUtama disabled={kirim}>{kirim ? 'Mengirim…' : 'Kirim tautan reset'}</TombolUtama>
      <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
        <Icon name="info" size={14} stroke="currentColor" />Tautan reset berlaku 24 jam dan hanya bisa dipakai sekali.
      </p>
    </form>
  );
}
