'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { formatHitungMundur } from '@/lib/format';
import { validasiMasuk } from '@/lib/auth/rules';
import { Banner, Field, Judul, PasswordInput, TeksInput, TombolUtama } from './ui';

type Status = 'diam' | 'salah' | 'nonaktif' | 'jaringan';
export type PeranMasuk = 'penyewa' | 'admin';

/** Toggle pilihan peran (FR-PUB-05 / FR-ADM-01): dua kartu sejajar dengan gap di tengah. Satu endpoint, peran berbeda. */
function PilihanPeran({ peran, ganti }: { peran: PeranMasuk; ganti: (p: PeranMasuk) => void }) {
  const pilihan: { nilai: PeranMasuk; label: string; ket: string }[] = [
    { nilai: 'penyewa', label: 'Penyewa', ket: 'Pesan & kelola jadwalmu' },
    { nilai: 'admin', label: 'Admin', ket: 'Panel pengelola' },
  ];
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink">Masuk sebagai</span>
      <div role="radiogroup" aria-label="Masuk sebagai" className="flex gap-3">
        {pilihan.map((p) => {
          const aktif = peran === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => ganti(p.nilai)}
              className={`flex-1 rounded-2xl border-[1.5px] px-4 py-3 text-left no-underline transition ${
                aktif ? 'border-brand bg-brand/10' : 'border-line bg-white hover:border-ink/40'
              }`}
            >
              <span className={`block text-sm font-bold ${aktif ? 'text-[#0A6B3A]' : 'text-ink'}`}>{p.label}</span>
              <span className="block text-xs text-muted">{p.ket}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MasukForm({ next, peranAwal = 'penyewa' }: { next: string; peranAwal?: PeranMasuk }) {
  const router = useRouter();
  const [peran, setPeran] = useState<PeranMasuk>(peranAwal);
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
      const res = await fetch('/api/auth/masuk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, kataSandi: sandi, peran }) });
      const b = await res.json();
      if (b.ok) {
        // Penyewa: kembali ke `next`. Admin: hanya tujuan /admin yang dihormati, selain itu panel.
        const tujuan = peran === 'admin' ? (next.startsWith('/admin') ? next : '/admin/lapangan') : next;
        router.replace(tujuan);
        router.refresh();
        return;
      }
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
  const tujuanAdmin = next.startsWith('/admin') ? next : '/admin/lapangan';
  return (
    <>
      <PilihanPeran peran={peran} ganti={(p) => { setPeran(p); setStatus('diam'); }} />
      <div className="mt-[18px]">
        {peran === 'penyewa' ? (
          <>
            <Judul kata="Masuk" hijau="akun">Belum punya akun? <Link href={daftarHref} className="font-bold text-[#0A6B3A]">Daftar gratis</Link></Judul>
            {next.startsWith('/pesan') && (
              <Banner nada="teal" ikon="info" role="note">Setelah masuk, kamu kembali ke pemesanan. Pilihan slotmu tetap tersimpan.</Banner>
            )}
          </>
        ) : (
          <>
            <Judul kata="Masuk" hijau="admin">Panel pengelola lapangan. Bukan akun admin? Beralih ke Penyewa.</Judul>
            <p className="-mt-2 text-sm text-muted">Punya akses admin? <Link href={`/admin/masuk${tujuanAdmin === '/admin/lapangan' ? '' : `?next=${encodeURIComponent(tujuanAdmin)}`}`} className="font-bold text-[#0A6B3A]">Masuk lewat halaman admin</Link>.</p>
          </>
        )}
      </div>
      {status === 'salah' && <Banner nada="merah" ikon="alert">{peran === 'admin' ? 'Email atau kata sandi tidak cocok, atau bukan akun admin. Periksa lagi.' : 'Email atau kata sandi tidak cocok. Periksa lagi.'}</Banner>}
      {status === 'nonaktif' && <Banner nada="merah" ikon="cancel">Akun ini dinonaktifkan dan tidak dapat masuk. Email tidak bisa didaftarkan ulang. Hubungi pengelola.</Banner>}
      {status === 'jaringan' && <Banner nada="merah" ikon="alert">Belum bisa terhubung ke server. Coba lagi sebentar lagi.</Banner>}
      {tunggu > 0 && <Banner nada="amber" ikon="clock">Terlalu banyak percobaan masuk. Coba lagi dalam <b>{formatHitungMundur(tunggu)}</b>.</Banner>}
      <form noValidate onSubmit={kirimForm} className="flex flex-col gap-[18px]">
        <Field id="email" label="Email" galat={galat.email}>
          <TeksInput id="email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder={peran === 'admin' ? 'admin@contoh.id' : 'nama@email.com'} galat={galat.email} />
        </Field>
        <Field id="kataSandi" label="Kata sandi" galat={galat.kataSandi}>
          <PasswordInput id="kataSandi" value={sandi} onChange={setSandi} autoComplete="current-password" galat={galat.kataSandi} />
        </Field>
        <div className="-mt-2 text-right">
          <Link href="/lupa-sandi" className="text-sm font-bold text-[#0A6B3A]">Lupa kata sandi?</Link>
        </div>
        <TombolUtama disabled={kirim || tunggu > 0}>{kirim ? 'Memproses…' : peran === 'admin' ? 'Masuk sebagai admin' : 'Masuk'}</TombolUtama>
      </form>
    </>
  );
}
