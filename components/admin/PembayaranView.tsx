import { AdminShell } from '@/components/admin/AdminShell';
import { PilFilter } from '@/components/admin/ui';
import type { AntrianPembayaran } from '@/lib/admin/pengecualian/data';
import { PembatalanTabel } from './PembatalanTabel';
import { PengecualianTabel } from './PengecualianTabel';
import { RefundTabel } from './RefundTabel';

/** Antrean pembayaran bermasalah, pengajuan batal, dan refund (FR-ADM-06/07), dipilah via ?tab=. */
export function PembayaranView({ tab, antrian }: { tab: 'pengecualian' | 'batal' | 'refund'; antrian: AntrianPembayaran }) {
  return (
    <AdminShell aktif="Pembayaran" judul="Pembayaran &amp; pembatalan"
      keterangan="Putuskan pembayaran yang bermasalah, tanggapi pengajuan pembatalan penyewa, dan pantau refund berjalan.">
      <PilFilter namaParam="tab" basis="/admin/pembayaran" aktif={tab}
        daftar={[
          { nilai: 'pengecualian', label: `Pengecualian (${antrian.pengecualian.length})` },
          { nilai: 'batal', label: `Pengajuan batal (${antrian.pembatalan.length})` },
          { nilai: 'refund', label: `Refund (${antrian.refund.length})` },
        ]} />

      <div className="mt-6">
        {tab === 'pengecualian' && <PengecualianTabel baris={antrian.pengecualian} />}
        {tab === 'batal' && <PembatalanTabel baris={antrian.pembatalan} />}
        {tab === 'refund' && <RefundTabel baris={antrian.refund} />}
      </div>
    </AdminShell>
  );
}
