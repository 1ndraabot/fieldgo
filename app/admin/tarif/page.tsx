import type { Metadata } from 'next';
import { KelolaTarifView } from '@/components/admin/KelolaTarifView';
import { getAdminLapangan, getAdminTarif } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Kelola tarif' };

const ID = /^\d{1,4}$/;

export default async function AdminTarif({ searchParams }: { searchParams: Promise<{ lapangan?: string | string[] }> }) {
  const raw = (await searchParams).lapangan;
  const daftar = getAdminLapangan().map((l) => ({ id: l.id, nama: l.nama }));
  const aktifId = typeof raw === 'string' && ID.test(raw) && daftar.some((l) => l.id === Number(raw)) ? Number(raw) : daftar[0].id;
  const data = getAdminTarif(aktifId)!;
  return <KelolaTarifView daftar={daftar} aktifId={aktifId} lapanganNama={data.lapanganNama} aturan={data.aturan} />;
}
