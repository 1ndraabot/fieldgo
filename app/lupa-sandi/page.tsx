import type { Metadata } from 'next';
import Link from 'next/link';
import { LupaSandiForm } from '@/components/auth/LupaSandiForm';
import { Logo } from '@/components/Header';

export const metadata: Metadata = { title: 'Gelanggang — Lupa kata sandi' };

// TODO(belakang): halaman publik; tidak ada data sensitif — tanpa guard.
export default function LupaSandi() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-white">
      <header className="px-[clamp(16px,4.5vw,64px)] py-5">
        <Link href="/" aria-label="Gelanggang, beranda" className="no-underline"><Logo /></Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-[clamp(16px,4.5vw,64px)] py-14">
        <div className="w-full max-w-[480px] rounded-[32px] border-[1.5px] border-line bg-white p-9 shadow-[0_24px_48px_rgba(8,44,28,.08)]">
          <LupaSandiForm />
        </div>
      </main>
    </div>
  );
}
