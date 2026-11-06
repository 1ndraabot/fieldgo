'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { formatHitungMundur } from '@/lib/format';
import { validasiMasuk } from '@/lib/auth/rules';
import { Banner, Field, Judul, PasswordInput, TeksInput, TombolUtama } from './ui';

type Status = 'diam' | 'salah' | 'nonaktif' | 'jaringan';

export function MasukForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('diam');
  const [tunggu, setTunggu] = useState(0);
  const [kirim, setKirim] = useState(false);

  useEffect(() => {
    if (tunggu <= 0) return;
    const id = setTimeout(() => setTunggu((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tunggu]);

  async function kirimForm(e: FormEvent) {
    e.preventDefault();
    const g = validasiMasuk({ email, kataSandi: sandi }); // lapisan 1: browser (server memeriksa ulang)
    setGalat(g);
    setStatus('diam');
    if (Object.keys(g).length) return;
    setKirim(true);
    try {
      const res = await fetch('/api/auth/masuk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, kataSandi: sandi }) });
      const b = await res.json();
      if (b.ok) { router.replace(next); router.refresh(); return; }
      if (b.kode === 'DIBATASI') setTunggu(b.ulangiDetik);
      else if (b.kode === 'KREDENSIAL_SALAH') setStatus('salah');
      else if (b.kode === 'AKUN_NONAKTIF') setStatus('nonaktif');
      else if (b.kode === 'VALIDASI') setGalat(b.galat);
      else setStatus('jaringan');
    } catch {
      setStatus('jaringan');
    } finally {
      setKirim(false);
    }
  }

  const daftarHref = `/daftar${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`;
  return (
    <>
      <Judul kata="Masuk" hijau="akun">Belum punya akun? <Link href={daftarHref} className="font-bold text-[#0A6B3A]">Daftar gratis</Link></Judul>
      {next.startsWith('/pesan') && (
        <Banner nada="teal" ikon="info" role="note">Setelah masuk, kamu kembali ke pemesanan. Pilihan slotmu tetap tersimpan.</Banner>
      )}
      {status === 'salah' && <Banner nada="merah" ikon="alert">Email atau kata sandi tidak cocok. Periksa lagi.</Banner>}
      {status === 'nonaktif' && <Banner nada="merah" ikon="cancel">Akun ini dinonaktifkan dan tidak dapat masuk. Email tidak bisa didaftarkan ulang. Hubungi pengelola.</Banner>}
      {status === 'jaringan' && <Banner nada="merah" ikon="alert">Belum bisa terhubung ke server. Coba lagi sebentar lagi.</Banner>}
      {tunggu > 0 && <Banner nada="amber" ikon="clock">Terlalu banyak percobaan masuk. Coba lagi dalam <b>{formatHitungMundur(tunggu)}</b>.</Banner>}
      <form noValidate onSubmit={kirimForm} className="flex flex-col gap-[18px]">
        <Field id="email" label="Email" galat={galat.email}>
          <TeksInput id="email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="nama@email.com" galat={galat.email} />
        </Field>
        <Field id="kataSandi" label="Kata sandi" galat={galat.kataSandi}>
          <PasswordInput id="kataSandi" value={sandi} onChange={setSandi} autoComplete="current-password" galat={galat.kataSandi} />
        </Field>
        <TombolUtama disabled={kirim || tunggu > 0}>{kirim ? 'Memproses…' : 'Masuk'}</TombolUtama>
      </form>
    </>
  );
}
