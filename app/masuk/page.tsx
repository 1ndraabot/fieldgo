import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { MasukForm } from '@/components/auth/MasukForm';
import { amanNext } from '@/lib/auth/rules';
import { penggunaSaatIni } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Gelanggang — Masuk' };

export default async function Masuk({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = amanNext(typeof sp.next === 'string' ? sp.next : null); // cegah open redirect
  if (await penggunaSaatIni()) redirect(next);
  return <AuthShell varian="masuk"><MasukForm next={next} /></AuthShell>;
}
