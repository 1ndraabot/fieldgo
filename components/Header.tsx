import Link from 'next/link';
import { inisial } from '@/lib/auth/rules';
import { DEMO } from '@/lib/demo';
import { SITE } from '@/lib/site';
import { KeluarButton } from './auth/KeluarButton';
import { Icon } from './icons';

export function Logo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-[15px] bg-brand-2"><Icon name="ball" size={24} stroke="#C6F432" /></span>
      <span className="font-display text-2xl font-bold tracking-[-0.02em]">{SITE.nama}</span>
    </span>
  );
}

const NAV = [['Lapangan', '/#lapangan'], ['Kalender', '/#kalender'], ['Jadwal saya', '/jadwal-saya'], ['Riwayat', '/riwayat']] as const;

/** `pengguna` hanya berisi nama (jangan pernah mengoper hash sandi ke komponen). */
export function Header({ pengguna = null, aktif = 'Lapangan' }: { pengguna?: { nama: string } | null; aktif?: (typeof NAV)[number][0] }) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 bg-white px-[clamp(16px,4.5vw,64px)] py-5">
      <Link href="/" aria-label={`${SITE.nama}, beranda`} className="no-underline"><Logo /></Link>
      <nav aria-label="Menu utama" className="flex gap-1 rounded-full border border-line bg-mist p-1.5 max-[980px]:hidden">
        {NAV.map(([nama, href]) => (
          <Link key={nama} href={href} aria-current={nama === aktif ? 'page' : undefined} className={`rounded-full px-[22px] py-2.5 text-[15px] font-semibold no-underline ${nama === aktif ? 'bg-ink text-white' : ''}`}>{nama}</Link>
        ))}
      </nav>
      {pengguna ? (
        <div className="flex items-center gap-2.5">
          {DEMO && <span className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-muted max-[980px]:hidden">Mode demo</span>}
          <span role="img" aria-label={`Masuk sebagai ${pengguna.nama}`} title={pengguna.nama}
            className="flex size-10 items-center justify-center rounded-full bg-lime font-display text-sm font-bold">{inisial(pengguna.nama)}</span>
          <KeluarButton />
        </div>
      ) : (
        <div className="flex gap-2.5">
          <Link href="/masuk" className="btn rounded-full border-[1.5px] border-ink px-6 py-[13px] text-[15px] font-bold no-underline">Masuk</Link>
          <Link href="/daftar" className="btn rounded-full bg-brand px-6 py-[13px] text-[15px] font-bold text-white no-underline">Daftar</Link>
        </div>
      )}
    </header>
  );
}
