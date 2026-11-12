import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetSandiForm } from '@/components/auth/ResetSandiForm';
import { Banner } from '@/components/auth/ui';
import { Logo } from '@/components/Header';

export const metadata: Metadata = { title: 'Gelanggang — Atur kata sandi baru' };

// Token reset dipakai sekali & berlaku 24 jam; validasi sungguhan di server saat backend tersambung (FR-ACC-04).
export default async function ResetSandi({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const token = typeof (await searchParams).token === 'string' ? (await searchParams).token as string : '';
  const sah = /^[A-Za-z0-9_-]{10,120}$/.test(token);
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-white">
      <header className="px-[clamp(16px,4.5vw,64px)] py-5">
        <Link href="/" aria-label="Gelanggang, beranda" className="no-underline"><Logo /></Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-[clamp(16px,4.5vw,64px)] py-14">
        <div className="w-full max-w-[480px] rounded-[32px] border-[1.5px] border-line bg-white p-9 shadow-[0_24px_48px_rgba(8,44,28,.08)]">
          {sah ? (
            <ResetSandiForm />
          ) : (
            <div className="flex flex-col gap-5">
              <Banner nada="merah" ikon="alert">Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.</Banner>
              <Link href="/lupa-sandi" className="btn flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-bold text-white no-underline">
                Minta tautan reset
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
