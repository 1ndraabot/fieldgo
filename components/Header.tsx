import Link from 'next/link';
import { SITE } from '@/lib/site';
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

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 bg-white px-[clamp(16px,4.5vw,64px)] py-5">
      <Link href="/" aria-label={`${SITE.nama}, beranda`} className="no-underline"><Logo /></Link>
      <nav aria-label="Menu utama" className="flex gap-1 rounded-full border border-line bg-mist p-1.5 max-[980px]:hidden">
        {NAV.map(([nama, href], i) => (
          <Link key={nama} href={href} className={`rounded-full px-[22px] py-2.5 text-[15px] font-semibold no-underline ${i === 0 ? 'bg-ink text-white' : ''}`}>{nama}</Link>
        ))}
      </nav>
      <div className="flex gap-2.5">
        <Link href="/masuk" className="btn rounded-full border-[1.5px] border-ink px-6 py-[13px] text-[15px] font-bold no-underline">Masuk</Link>
        <Link href="/daftar" className="btn rounded-full bg-brand px-6 py-[13px] text-[15px] font-bold text-white no-underline">Daftar</Link>
      </div>
    </header>
  );
}
