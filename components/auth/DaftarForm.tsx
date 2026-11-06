'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { formatHitungMundur } from '@/lib/format';
import { kekuatanSandi, validasiDaftar } from '@/lib/auth/rules';
import { Banner, Field, Judul, PasswordInput, TeksInput, TombolUtama } from './ui';
import { Icon } from '@/components/icons';

export function DaftarForm({ next }: { next: string }) {
  const [f, setF] = useState({ nama: '', email: '', nomorKontak: '', kataSandi: '', setuju: false });
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [galatUmum, setGalatUmum] = useState(false);
  const [tunggu, setTunggu] = useState(0);
  const [kirim, setKirim] = useState(false);
  const [selesai, setSelesai] = useState<string | null>(null);
  const ubah = <K extends keyof typeof f>(k: K) => (v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const kuat = kekuatanSandi(f.kataSandi);
  const masukHref = `/masuk${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`;

  useEffect(() => {
    if (tunggu <= 0) return;
    const id = setTimeout(() => setTunggu((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tunggu]);

  async function kirimForm(e: FormEvent) {
    e.preventDefault();
    const g = validasiDaftar(f); // lapisan 1: browser (server memeriksa ulang)
    setGalat(g);
    setGalatUmum(false);
    if (Object.keys(g).length) return;
    setKirim(true);
    try {
      const res = await fetch('/api/auth/daftar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const b = await res.json();
      if (b.ok) setSelesai(f.email.trim().toLowerCase());
      else if (b.kode === 'EMAIL_DIPAKAI') setGalat({ email: 'Email ini sudah terdaftar. Masuk, atau gunakan email lain.' });
      else if (b.kode === 'VALIDASI') setGalat(b.galat);
      else if (b.kode === 'DIBATASI') setTunggu(b.ulangiDetik);
      else setGalatUmum(true);
    } catch {
      setGalatUmum(true);
    } finally {
      setKirim(false);
    }
  }

  if (selesai) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[32px] border-[1.5px] border-line bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(8,44,28,.08)]">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-mint"><Icon name="mail" size={32} stroke="#0E8A4A" /></span>
        <h1 className="font-display text-[clamp(24px,2.6vw,32px)] font-bold tracking-[-0.03em]">Cek email kamu</h1>
        <p className="text-base leading-relaxed text-muted">Kami mengirim tautan verifikasi ke <b className="text-ink">{selesai}</b>. Tautan berlaku 24 jam dan hanya bisa dipakai sekali.</p>
        <div className="w-full text-left"><Banner nada="amber" ikon="info" role="note">Sebelum email diverifikasi, kamu tetap bisa masuk tetapi belum bisa memesan lapangan.</Banner></div>
        {process.env.NODE_ENV !== 'production' && (
          <div className="w-full text-left"><Banner nada="teal" ikon="info" role="note">Mode pengembangan: email belum dikirim sungguhan. Tautan verifikasi dicetak di terminal server (<code>npm run dev</code>).</Banner></div>
        )}
        <Link href={masukHref} className="btn flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-bold text-white no-underline">Masuk dulu</Link>
      </div>
    );
  }

  return (
    <>
      <Judul kata="Buat" hijau="akun">Sudah punya akun? <Link href={masukHref} className="font-bold text-[#0A6B3A]">Masuk</Link></Judul>
      {tunggu > 0 && <Banner nada="amber" ikon="clock">Terlalu banyak pendaftaran. Coba lagi dalam <b>{formatHitungMundur(tunggu)}</b>.</Banner>}
      {galatUmum && <Banner nada="merah" ikon="alert">Pendaftaran belum berhasil. Coba lagi sebentar lagi.</Banner>}
      <form noValidate onSubmit={kirimForm} className="flex flex-col gap-4">
        <Field id="nama" label="Nama" galat={galat.nama}><TeksInput id="nama" value={f.nama} onChange={ubah('nama')} autoComplete="name" placeholder="Nama lengkap" galat={galat.nama} /></Field>
        <Field id="email" label="Email" galat={galat.email}><TeksInput id="email" type="email" value={f.email} onChange={ubah('email')} autoComplete="email" placeholder="nama@email.com" galat={galat.email} /></Field>
        <Field id="nomorKontak" label="Nomor kontak" galat={galat.nomorKontak}><TeksInput id="nomorKontak" type="tel" value={f.nomorKontak} onChange={ubah('nomorKontak')} autoComplete="tel" placeholder="0812-3456-7890" galat={galat.nomorKontak} /></Field>
        <Field id="kataSandi" label="Kata sandi" galat={galat.kataSandi}>
          <PasswordInput id="kataSandi" value={f.kataSandi} onChange={ubah('kataSandi')} autoComplete="new-password" placeholder="Minimal 8 karakter" galat={galat.kataSandi} />
          <div className="flex items-center gap-2.5">
            <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-[#E3EAE6]"><div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${kuat.persen}%`, background: kuat.warna }} /></div>
            <span aria-live="polite" className="min-w-16 text-right text-[13px] font-bold">{kuat.label}</span>
          </div>
          <span className="text-[13px] font-medium text-muted">Gunakan huruf besar, kecil, angka, dan simbol agar lebih kuat.</span>
        </Field>
        <div>
          <label className="flex items-start gap-3 text-[15px] font-medium leading-normal">
            <input type="checkbox" name="setuju" checked={f.setuju} onChange={(e) => ubah('setuju')(e.target.checked)} aria-invalid={galat.setuju ? true : undefined}
              aria-describedby={galat.setuju ? 'setuju-galat' : undefined} className="mt-px size-[22px] shrink-0 accent-brand" />
            <span>Saya setuju dengan syarat penggunaan dan paham bahwa bukti transfer yang ditolak bersifat final.</span>
          </label>
          {galat.setuju && <span id="setuju-galat" role="alert" className="mt-2 block text-[13px] font-bold text-[#B42328]">{galat.setuju}</span>}
        </div>
        <TombolUtama disabled={kirim || tunggu > 0}>{kirim ? 'Memproses…' : 'Daftar'}</TombolUtama>
      </form>
    </>
  );
}
