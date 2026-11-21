import type { Metadata } from 'next';
import { JamOperasionalView } from '@/components/admin/JamOperasionalView';
import { getAdminJamOperasional, getAdminLapangan } from '@/lib/demo-fe';

export const metadata: Metadata = { title: 'Gelanggang — Admin · Jam operasional' };

const ID = /^\d{1,4}$/;

// FE dulu: data dummy. Penyimpanan jam operasional sungguhan (FR-ADM-04) menyusul bersama backend admin.
export default async function AdminJamOperasional({ searchParams }: { searchParams: Promise<{ lapangan?: string | string[] }> }) {
  const raw = (await searchParams).lapangan;
  const daftar = getAdminLapangan().map((l) => ({ id: l.id, nama: l.nama }));
  const aktifId = typeof raw === 'string' && ID.test(raw) && daftar.some((l) => l.id === Number(raw)) ? Number(raw) : daftar[0].id;
  const data = getAdminJamOperasional(aktifId)!;
  return <JamOperasionalView daftar={daftar} aktifId={aktifId} lapanganNama={data.lapanganNama} baris={data.baris} />;
}
