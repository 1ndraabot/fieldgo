'use client';

import { useState, type FormEvent } from 'react';
import { Banner, Field, Judul, TeksInput, TombolUtama } from '@/components/auth/ui';
import { Icon } from '@/components/icons';
import { validasiLupa } from '@/lib/auth/rules';

/** Form lupa kata sandi (FR-ACC-04): POST nyata. Respons selalu sukses (anti-enumeration). */
export function LupaSandiForm() {
  const [email, setEmail] = useState('');
  const [galat, setGalat] = useState('');
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);

  async function kirimTautan(e: FormEvent) {
    e.preventDefault();
    const g = validasiLupa({ email }).email ?? '';
    setGalat(g);
    if (g) return;
    setKirim(true);
    try {
      const res = await fetch('/api/auth/lupa-sandi', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const b = await res.json();
      if (b.ok) setSukses(true);
      else if (b.kode === 'VALIDASI' && b.galat?.email) setGalat(b.galat.email);
      else if (b.kode === 'DIBATASI') setGalat('Terlalu banyak permintaan. Coba lagi nanti atau buka halaman ini baru.');
      else setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-5">
        <Banner nada="teal" ikon="mail" role="status">
          Bila email terdaftar, tautan reset sudah dikirim ke <strong>{email}</strong>. Tautan berlaku 1 jam dan sekali pakai.
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
      {galat && <Banner nada="merah" ikon="alert" role="alert">{galat}</Banner>}
      <Field id="email" label="Email terdaftar" galat={galat}>
        <TeksInput id="email" value={email} onChange={(v) => { setEmail(v); setGalat(''); }}
          autoComplete="email" placeholder="nama@contoh.id" type="email" galat={galat} />
      </Field>
      <TombolUtama disabled={kirim}>{kirim ? 'Mengirim…' : 'Kirim tautan reset'}</TombolUtama>
      <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
        <Icon name="info" size={14} stroke="currentColor" />Tautan reset berlaku 1 jam dan hanya bisa dipakai sekali.
      </p>
    </form>
  );
}
