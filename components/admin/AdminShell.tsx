import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { Logo } from '@/components/Header';
import { SITE } from '@/lib/site';

const NAV: [IconName, string, string][] = [
  ['ball', 'Lapangan', '/admin/lapangan'],
  ['card', 'Tarif', '/admin/tarif'],
  ['clock', 'Jam operasional', '/admin/jam-operasional'],
  ['cancel', 'Blacklist', '/admin/blacklist'],
  ['check', 'Verifikasi', '/admin/verifikasi'],
  ['calendar', 'Pesanan', '/admin/pesanan'],
  ['search', 'Rekap', '/admin/rekap'],
  ['shield', 'Pengguna', '/admin/pengguna'],
  ['info', 'Pengaturan', '/admin/pengaturan'],
];

/** Cangkang panel admin: sidebar gelap + area konten (FR-ADM, PRD Bagian 9). */
export function AdminShell({ aktif, judul, keterangan, aksi, children }: {
  aktif: string; judul: string; keterangan?: string; aksi?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-wrap bg-white">
      <aside aria-label="Menu admin"
        className="flex max-h-screen w-[264px] shrink-0 flex-col gap-8 rounded-r-[40px] bg-ink px-6 py-8 text-white max-[980px]:max-h-none max-[980px]:w-full max-[980px]:rounded-b-[40px] max-[980px]:rounded-r-none">
        <Link href="/" aria-label={`${SITE.nama}, beranda`} className="no-underline [&_span]:text-white"><Logo /></Link>
        <nav aria-label="Menu admin" className="flex flex-1 flex-col gap-1 max-[980px]:flex-row max-[980px]:overflow-x-auto max-[980px]:pb-2">
          {NAV.map(([ikon, nama, href]) => {
            const on = nama === aktif;
            return (
              <Link key={nama} href={href} aria-current={on ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-3 text-[15px] font-semibold no-underline transition-none ${on ? 'bg-lime text-ink' : 'text-white/85 hover:bg-white/10'}`}>
                <Icon name={ikon} size={18} stroke={on ? '#0B2B1E' : '#C6F432'} width={2.4} />{nama}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-3 text-[13px] text-white/70">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white no-underline"><Icon name="kanan" size={14} stroke="#C6F432" width={2.6} />Buka situs penyewa</Link>
          <span>{SITE.alamat} · {SITE.jam}</span>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 px-[clamp(20px,3.5vw,56px)] py-10">
        <div aria-hidden="true" className="absolute right-[-120px] top-[-60px] size-[380px] rounded-full bg-mint opacity-60 blur-[100px]" />
        <div className="relative z-[1]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-bold text-[#0A6B3A]">
                <Icon name="shield" size={13} stroke="#0A6B3A" width={2.8} />Panel Admin · Mode tampilan
              </span>
              <h1 className="mt-3 font-display text-[clamp(30px,3.8vw,44px)] font-bold leading-[1.1] tracking-[-0.035em]">{judul}</h1>
              {keterangan && <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">{keterangan}</p>}
            </div>
            {aksi}
          </div>
          <div className="mt-9">{children}</div>
        </div>
      </main>
    </div>
  );
}
