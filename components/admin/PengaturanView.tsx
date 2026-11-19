import { AdminShell } from '@/components/admin/AdminShell';
import PengaturanForm from '@/components/admin/PengaturanForm';
import type { Pengaturan } from '@/lib/admin/pengaturan/data';

/** Pengaturan global admin (FR-ADM-11): rekening refund, batas waktu, gateway, dan metode pembayaran. */
export function PengaturanView({ data }: { data: Pengaturan }) {
  return (
    <AdminShell aktif="Pengaturan" judul="Pengaturan"
      keterangan="Rekening tujuan pengembalian dana dan batas waktu global. Perubahan hanya memengaruhi pesanan yang dibuat setelahnya (BR-06).">
      <div className="max-w-[720px] rounded-[28px] border-[1.5px] border-line bg-white p-7">
        <PengaturanForm data={data} />
      </div>
    </AdminShell>
  );
}
