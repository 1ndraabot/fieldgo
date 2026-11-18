import Link from "next/link";
import type { ReactNode } from "react";

/** Menu panel admin — rute mengikuti PRD Bagian 9. Baru "Verifikasi" yang sudah dibangun. */
const NAV = [
  { label: "Lapangan", href: "/admin/lapangan" },
  { label: "Tarif", href: "/admin/tarif" },
  { label: "Jam operasional", href: "/admin/jam-operasional" },
  { label: "Blacklist", href: "/admin/blacklist" },
  { label: "Verifikasi", href: "/admin/verifikasi", badge: true },
  { label: "Pesanan", href: "/admin/pesanan" },
  { label: "Rekap", href: "/admin/rekap" },
  { label: "Pengguna", href: "/admin/pengguna" },
  { label: "Pengaturan", href: "/admin/pengaturan" },
] as const;

type Props = { active: string; badge?: number; children: ReactNode };

/** Kerangka halaman admin: sidebar gelap + area konten. Di mobile sidebar menjadi bilah atas. */
export default function AdminShell({ active, badge = 0, children }: Props) {
  return (
    <div className="relative mx-auto flex min-h-[1024px] w-full max-w-[1440px] flex-wrap overflow-x-clip bg-f0">
      <aside className="dark relative box-border min-w-[240px] flex-[0_0_260px] overflow-hidden rounded-r-[48px] bg-f9 px-5 py-7 text-white m:basis-full m:rounded-r-none m:rounded-b-[32px]">
        <div aria-hidden="true" className="absolute bottom-[-60px] left-[-80px] h-[300px] w-[300px] rounded-full bg-lime opacity-25 blur-[80px]" />
        <Link href="/" className="relative flex items-center gap-3 px-1.5" aria-label="Gelanggang — Beranda">
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-f4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6F432" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3.5 3.2 3.5 16.8 0 20M12 2c-3.5 3.2-3.5 16.8 0 20" /></svg>
          </span>
          <span>
            <span className="block font-display text-xl font-bold tracking-[-0.02em]">Gelanggang</span>
            <span className="block text-xs font-semibold text-white/70">Panel admin</span>
          </span>
        </Link>
        <nav aria-label="Menu admin" className="relative mt-8 flex flex-col gap-1 m:flex-row m:flex-wrap">
          {NAV.map((n) => {
            const on = n.label === active;
            return (
              <Link
                key={n.label} href={n.href} aria-current={on ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3 text-[15px] ${on ? "bg-lime font-bold text-f9" : "font-semibold hover:bg-white/[.08]"}`}
              >
                {n.label}
                {"badge" in n && n.badge && badge > 0 && (
                  <span aria-label={`${badge} menunggu`} className="flex h-[26px] min-w-[26px] items-center justify-center rounded-full bg-f9 px-2 text-[13px] text-lime">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="relative min-w-0 flex-[1_1_640px] px-[clamp(16px,3vw,40px)] pb-16 pt-10">
        <div aria-hidden="true" className="absolute right-[-80px] top-[-60px] h-[460px] w-[460px] rounded-full bg-f1 opacity-90 blur-[90px]" />
        <div className="relative">{children}</div>
      </main>
    </div>
  );
}
