import type { Metadata } from 'next';
import { KelolaLapanganView } from '@/components/admin/KelolaLapanganView';
import { getDaftarLapangan, getLapanganEdit, getMasterLapangan, type LapanganEdit } from '@/lib/admin/lapangan/data';
import { wajibAdmin } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'FieldGo — Admin · Kelola lapangan' };
export const dynamic = 'force-dynamic';

export default async function AdminLapangan() {
  await wajibAdmin('/admin/lapangan');
  const daftar = await getDaftarLapangan();
  const [master, detail] = await Promise.all([
    getMasterLapangan(),
    Promise.all(daftar.map((l) => getLapanganEdit(l.id))),
  ]);
  return (
    <KelolaLapanganView
      daftar={daftar}
      master={master}
      detail={detail.filter((d): d is LapanganEdit => d !== null)}
    />
  );
}
