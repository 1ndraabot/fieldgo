'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { formatHitungMundur } from '@/lib/format';
import { validasiMasuk } from '@/lib/auth/rules';
import { Banner, Field, Judul, PasswordInput, TeksInput, TombolUtama } from '@/components/auth/ui';

type Status = 'diam' | 'salah' | 'nonaktif' | 'jaringan';

/** Login admin (FR-ADM-01): endpoint /api/auth/masuk dengan peran 'admin'. Penyewa ditolak di sini. */
export function AdminMasukForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [status, setStatus] = useState<Status>('diam');
  const [tunggu, setTunggu] = useState(0);
  const [kirim, setKirim] = useState(false);

  async function masuk(e: FormEvent) {
    e.preventDefault();
    const g = validasiMasuk({ email, kataSandi: sandi }); // lapisan 1: browser (server memeriksa ulang)
    if (Object.keys(g).length) { setStatus('diam'); return; }
    setKirim(true);
    try {
      const res = await fetch('/api/auth/masuk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, kataSandi: sandi, peran: 'admin' }) });
      const b = await res.json();
      if (b.ok) { router.replace(next.startsWith('/admin') ? next : '/admin/lapangan'); router.refresh(); return; }
      if (b.kode === 'DIBATASI') setTunggu(b.ulangiDetik);
      else if (b.kode === 'KREDENSIAL_SALAH') setStatus('salah');
      else if (b.kode === 'AKUN_NONAKTIF') setStatus('nonaktif');
      else setStatus('jaringan');
    } catch {
      setStatus('jaringan');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={masuk} noValidate className="flex flex-col gap-5">
      <Judul kata="Panel admin" hijau="masuk.">Login khusus pengelola. Akun penyewa tidak dapat masuk lewat halaman ini.</Judul>
      <p className="-mt-2 text-sm text-white/70">Ingin masuk sebagai penyewa? <Link href="/masuk" className="font-bold text-lime no-underline">Gunakan halaman masuk biasa</Link>.</p>
      {status === 'salah' && <Banner nada="merah" ikon="alert">Email atau kata sandi tidak cocok, atau bukan akun admin. Periksa lagi.</Banner>}
      {status === 'nonaktif' && <Banner nada="merah" ikon="cancel">Akun ini dinonaktifkan dan tidak dapat masuk. Hubungi pengelola utama.</Banner>}
      {status === 'jaringan' && <Banner nada="merah" ikon="alert">Belum bisa terhubung ke server. Coba lagi sebentar lagi.</Banner>}
      {tunggu > 0 && <Banner nada="amber" ikon="clock">Terlalu banyak percobaan masuk. Coba lagi dalam <b>{formatHitungMundur(tunggu)}</b>.</Banner>}
      <Field id="email" label="Email admin">
        <TeksInput id="email" value={email} onChange={(v) => { setEmail(v); setStatus('diam'); }}
          autoComplete="email" placeholder="admin@contoh.id" type="email" />
      </Field>
      <Field id="sandi" label="Kata sandi">
        <PasswordInput id="sandi" value={sandi} onChange={(v) => { setSandi(v); setStatus('diam'); }}
          autoComplete="current-password" placeholder="Kata sandi admin" />
      </Field>
      <TombolUtama disabled={kirim || tunggu > 0}>{kirim ? 'Memeriksa…' : 'Masuk sebagai admin'}</TombolUtama>
    </form>
  );
}
