import type { Metadata } from 'next';
import { JamOperasionalView } from '@/components/admin/JamOperasionalView';
import { getDaftarLapangan, getHalamanJam } from '@/lib/admin/lapangan/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Jam operasional' };
export const dynamic = 'force-dynamic';

const ID = /^\d{1,4}$/;

export default async function AdminJamOperasional({ searchParams }: { searchParams: Promise<{ lapangan?: string | string[] }> }) {
  await wajibAdmin('/admin/jam-operasional');
  const raw = (await searchParams).lapangan;
  const daftar = (await getDaftarLapangan()).map((l) => ({ id: l.id, nama: l.nama }));
  const aktifId = typeof raw === 'string' && ID.test(raw) && daftar.some((l) => l.id === Number(raw)) ? Number(raw) : daftar[0]?.id ?? 0;
  const data = aktifId ? await getHalamanJam(aktifId) : null;
  return (
    <JamOperasionalView
      key={aktifId}
      daftar={daftar}
      aktifId={aktifId}
      lapanganNama={data?.lapanganNama ?? '—'}
      baris={data?.baris ?? []}
      tarif={data?.tarif ?? []}
    />
  );
}
