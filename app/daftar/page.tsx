import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { DaftarForm } from '@/components/auth/DaftarForm';
import { amanNext } from '@/lib/auth/rules';
import { penggunaSaatIni } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Gelanggang — Daftar' };

export default async function Daftar({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const sp = await searchParams;
  const next = amanNext(typeof sp.next === 'string' ? sp.next : null);
  if (await penggunaSaatIni()) redirect(next);
  return <AuthShell varian="daftar"><DaftarForm next={next} /></AuthShell>;
}
