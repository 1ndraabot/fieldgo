import Link from 'next/link';
import { SITE } from '@/lib/site';
import { Logo } from './Header';

const col = 'flex flex-col gap-3 text-[15px] text-white/75';

export function Footer({ olahragaList }: { olahragaList: string[] }) {
  return (
    <footer className="relative -mt-px overflow-hidden rounded-t-[64px] bg-ink px-[clamp(20px,5vw,72px)] pt-20 text-white">
      <div className="flex flex-wrap justify-between gap-12">
        <div className="max-w-[360px] flex-[1_1_280px]">
          <Logo />
          <p className="mt-[18px] text-[15px] leading-relaxed text-white/75">{SITE.alamat}<br />{SITE.jam}</p>
        </div>
        <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-[72px] gap-y-12">
          <div>
            <div className="mb-4 font-display text-base font-bold">Lapangan</div>
            <div className={col}>
              {olahragaList.map((o) => <Link key={o} href={`/?olahraga=${encodeURIComponent(o)}#lapangan`} className="no-underline">{o}</Link>)}
            </div>
          </div>
          <div>
            <div className="mb-4 font-display text-base font-bold">Akun</div>
            <div className={col}>
              <Link href="/masuk" className="no-underline">Masuk</Link>
              <Link href="/daftar" className="no-underline">Daftar</Link>
              <Link href="/lupa-sandi" className="no-underline">Lupa kata sandi</Link>
            </div>
          </div>
        </nav>
      </div>
      <div aria-hidden="true" className="mt-[72px] h-[.62em] select-none overflow-hidden whitespace-nowrap text-center font-display text-[clamp(72px,17vw,250px)] font-extrabold leading-[.82] tracking-[-0.05em] text-forest">{SITE.nama}</div>
    </footer>
  );
}
