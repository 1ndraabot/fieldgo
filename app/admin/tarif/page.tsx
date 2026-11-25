import type { Metadata } from 'next';
import { KelolaTarifView } from '@/components/admin/KelolaTarifView';
import { getDaftarLapangan, getHalamanTarif } from '@/lib/admin/lapangan/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Kelola tarif' };
export const dynamic = 'force-dynamic';

const ID = /^\d{1,4}$/;

export default async function AdminTarif({ searchParams }: { searchParams: Promise<{ lapangan?: string | string[] }> }) {
  await wajibAdmin('/admin/tarif');
  const raw = (await searchParams).lapangan;
  const daftar = (await getDaftarLapangan()).map((l) => ({ id: l.id, nama: l.nama }));
  const aktifId = typeof raw === 'string' && ID.test(raw) && daftar.some((l) => l.id === Number(raw)) ? Number(raw) : daftar[0]?.id ?? 0;
  const data = aktifId ? await getHalamanTarif(aktifId) : null;
  return (
    <KelolaTarifView
      key={aktifId}
      daftar={daftar}
      aktifId={aktifId}
      lapanganNama={data?.lapanganNama ?? '—'}
      aturan={data?.aturan ?? []}
      jam={data?.jam ?? []}
    />
  );
}
