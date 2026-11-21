import { AdminShell } from '@/components/admin/AdminShell';
import PengaturanForm from '@/components/admin/PengaturanForm';
import type { PengaturanData } from '@/lib/demo-fe';

/** Pengaturan global admin (FR-ADM-11): rekening bayar, batas bayar, batas pembatalan. */
export function PengaturanView({ data }: { data: PengaturanData }) {
  return (
    <AdminShell aktif="Pengaturan" judul="Pengaturan"
      keterangan="Rekening tujuan pembayaran dan batas waktu global. Perubahan hanya memengaruhi pesanan yang dibuat setelahnya (BR-06).">
      <div className="max-w-[720px] rounded-[28px] border-[1.5px] border-line bg-white p-7">
        <PengaturanForm data={data} />
      </div>
    </AdminShell>
  );
}
