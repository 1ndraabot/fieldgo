import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BannerVerifikasi } from '@/components/auth/BannerVerifikasi';
import { KirimUlangButton } from '@/components/auth/KirimUlangButton';
import { Header } from '@/components/Header';
import { Icon, type IconName } from '@/components/icons';
import { auth } from '@/lib/auth/deps';
import { penggunaSaatIni } from '@/lib/auth/session';
import { verifikasiEmail } from '@/lib/auth/service';
import { DEMO } from '@/lib/demo';

export const metadata: Metadata = { title: 'Gelanggang — Verifikasi email' };

const tombolHijau = 'btn flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-bold text-white no-underline';
const tombolGaris = 'btn flex h-14 w-full items-center justify-center rounded-full border-[1.5px] border-ink text-base font-bold no-underline';

function Kartu({ ikon, warna, ikonWarna, judul, children }: { ikon: IconName; warna: string; ikonWarna: string; judul: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[32px] border-[1.5px] border-line bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(8,44,28,.08)]">
      <span className="flex size-[72px] items-center justify-center rounded-full" style={{ background: warna }}><Icon name={ikon} size={32} stroke={ikonWarna} /></span>
      <h1 className="font-display text-[clamp(24px,2.6vw,32px)] font-bold tracking-[-0.03em]">{judul}</h1>
      {children}
    </div>
  );
}

export default async function VerifikasiEmail({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const sp = await searchParams;
  const token = typeof sp.token === 'string' ? sp.token : null;
  // Token dipakai di sini (GET): tautan sekali pakai, jadi kunjungan kedua akan tampil "tidak berlaku".
  const hasilToken = token && !DEMO ? await verifikasiEmail(auth, token) : null;
  const pengguna = await penggunaSaatIni(); // dibaca sesudah verifikasi agar header/banner mutakhir
  if (!token && !pengguna) redirect('/masuk?next=%2Fverifikasi-email');

  const tampil = token ? (hasilToken === 'ok' ? 'berhasil' : 'tidak_berlaku') : pengguna?.emailTerverifikasiPada ? 'berhasil' : 'menunggu';
  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={pengguna ? { nama: pengguna.nama } : null} />
      {pengguna && !pengguna.emailTerverifikasiPada && tampil !== 'menunggu' && <BannerVerifikasi />}
      <main className="relative flex min-h-[720px] flex-col items-center px-[clamp(16px,4.5vw,64px)] pb-24 pt-8">
        <div aria-hidden="true" className="absolute right-[-100px] top-[-40px] size-[440px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div className="relative z-[1] w-full max-w-[560px]">
          {tampil === 'menunggu' && pengguna && (
            <Kartu ikon="mail" warna="#DDF7E8" ikonWarna="#0E8A4A" judul="Verifikasi email kamu">
              <p className="text-base leading-relaxed text-muted">Klik tautan di email yang dikirim ke <b className="text-ink">{pengguna.email}</b>. Tautan berlaku 24 jam dan sekali pakai.</p>
              <div className="flex w-full flex-col gap-4"><KirimUlangButton /></div>
              <span className="text-[13px] text-muted">Kirim ulang dibatasi agar tidak disalahgunakan.</span>
              {process.env.NODE_ENV !== 'production' && <span className="text-[13px] text-muted">Mode pengembangan: tautan dicetak di terminal server.</span>}
            </Kartu>
          )}
          {tampil === 'berhasil' && (
            <Kartu ikon="check" warna="#0E8A4A" ikonWarna="#FFFFFF" judul="Email terverifikasi">
              <p className="text-base leading-relaxed text-muted">Akunmu sudah aktif penuh. Sekarang kamu bisa memesan lapangan.</p>
              <Link href="/#lapangan" className={tombolHijau}>Pilih lapangan</Link>
              <Link href="/" className={tombolGaris}>Ke beranda</Link>
            </Kartu>
          )}
          {tampil === 'tidak_berlaku' && (
            <Kartu ikon="cancel" warna="#FDE4E5" ikonWarna="#B42328" judul="Tautan sudah tidak berlaku">
              <p className="text-base leading-relaxed text-muted">Tautan verifikasi kedaluwarsa atau sudah pernah dipakai. Minta tautan baru, lalu buka dari email terbaru.</p>
              {pengguna ? <div className="flex w-full flex-col gap-4"><KirimUlangButton label="Kirim tautan baru" /></div>
                : <Link href="/masuk?next=%2Fverifikasi-email" className={tombolHijau}>Masuk untuk minta tautan baru</Link>}
            </Kartu>
          )}
        </div>
      </main>
    </div>
  );
}
