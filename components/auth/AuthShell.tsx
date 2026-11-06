import type { ReactNode } from 'react';
import { CourtLines } from '@/components/Court';
import { Icon } from '@/components/icons';
import { Logo } from '@/components/Header';
import { SITE } from '@/lib/site';
import Link from 'next/link';

const VARIAN = {
  masuk: {
    judul: <>Masuk, lalu <span className="text-lime">amankan jam mainmu.</span></>,
    poin: ['Slot real-time, tanpa bentrok jadwal', 'Bayar lewat transfer, tanpa chat ke admin'],
    lapangan: true,
  },
  daftar: {
    judul: <>Satu akun,<br /><span className="text-lime">semua lapangan.</span></>,
    poin: ['Verifikasi email dulu, baru bisa memesan', 'Jadwal dan riwayat tersimpan rapi', 'Batalkan pesanan yang belum dibayar kapan saja'],
    lapangan: false,
  },
} as const;

export function AuthShell({ varian, children }: { varian: keyof typeof VARIAN; children: ReactNode }) {
  const v = VARIAN[varian];
  return (
    <div className="mx-auto flex min-h-[900px] w-full max-w-[1440px] flex-wrap overflow-x-clip bg-white">
      <aside className="relative flex max-w-[640px] flex-[1_1_440px] flex-col justify-between gap-8 overflow-hidden rounded-r-[56px] bg-ink px-[clamp(24px,4vw,64px)] py-11 text-white max-[980px]:max-w-none max-[980px]:rounded-b-[40px] max-[980px]:rounded-r-none">
        <div aria-hidden="true" className="absolute right-[-80px] top-[-80px] size-[320px] rounded-full bg-brand-3 opacity-35 blur-[90px]" />
        <div aria-hidden="true" className="absolute bottom-[-60px] left-[-100px] size-[360px] rounded-full bg-lime opacity-30 blur-[90px]" />
        <Link href="/" aria-label={`${SITE.nama}, beranda`} className="relative self-start no-underline"><Logo /></Link>
        <div className="relative flex flex-col gap-[22px]">
          {v.lapangan && (
            <div className="stripe-dark relative aspect-[7/4] overflow-hidden rounded-[32px] bg-brand-3 text-white">
              <CourtLines jenis="futsal" label="Ilustrasi lapangan futsal" />
            </div>
          )}
          <h2 className="font-display text-[clamp(28px,3vw,40px)] font-bold leading-[1.2] tracking-[-0.03em]">{v.judul}</h2>
          {v.poin.map((t) => (
            <div key={t} className="flex items-center gap-3 text-base font-semibold text-white/90">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-lime"><Icon name="check" size={14} stroke="#0B2B1E" width={3.4} /></span>
              {t}
            </div>
          ))}
        </div>
        <div className="relative text-[13px] text-white/75">{SITE.alamat} · {SITE.jam}</div>
      </aside>
      <main className="relative flex flex-[1_1_460px] items-center justify-center px-[clamp(16px,4.5vw,64px)] py-12">
        <div aria-hidden="true" className="absolute right-[-120px] top-[-60px] size-[380px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div className="relative z-[1] flex w-full max-w-[480px] flex-col gap-[22px]">{children}</div>
      </main>
    </div>
  );
}
