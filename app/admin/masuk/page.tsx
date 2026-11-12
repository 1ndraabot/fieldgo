import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminMasukForm } from '@/components/admin/AdminMasukForm';
import { Logo } from '@/components/Header';

export const metadata: Metadata = { title: 'Gelanggang — Masuk admin' };

// TODO(belakang): saat sesi admin jadi (FR-ADM-01), admin yang sudah masuk diarahkan ke /admin/lapangan.
export default function AdminMasuk() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-white">
      <header className="px-[clamp(16px,4.5vw,64px)] py-5">
        <Link href="/" aria-label="Gelanggang, beranda" className="no-underline"><Logo /></Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-[clamp(16px,4.5vw,64px)] py-14">
        <div className="w-full max-w-[480px] rounded-[32px] border-[1.5px] border-ink bg-ink p-9 text-white shadow-[0_24px_48px_rgba(8,44,28,.3)]">
          <span className="inline-flex items-center rounded-full bg-lime px-3.5 py-1.5 text-xs font-bold text-ink">Akses terbatas</span>
          <div className="mt-6 [&_p]:text-white/80 [&_span.text-muted]:text-white/70 [&_input]:bg-white [&_input]:text-ink">
            <AdminMasukForm />
          </div>
        </div>
      </main>
    </div>
  );
}
