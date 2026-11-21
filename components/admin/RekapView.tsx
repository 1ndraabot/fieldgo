import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import EksporCsvButton from '@/components/admin/EksporCsvButton';
import type { BarisRekap } from '@/lib/demo-fe';
import { formatRupiah } from '@/lib/format';

/** Rekap pesanan & pendapatan per lapangan (FR-ADM-09): kartu total, tabel rincian, ekspor CSV. */
export function RekapView({ periodeLabel, baris }: { periodeLabel: string; baris: BarisRekap[] }) {
  const total = baris.reduce((a, b) => ({ pesanan: a.pesanan + b.pesanan, jam: a.jam + b.jam, pendapatan: a.pendapatan + b.pendapatan }), { pesanan: 0, jam: 0, pendapatan: 0 });
  const terlaris = [...baris].sort((a, b) => b.pendapatan - a.pendapatan)[0];

  return (
    <AdminShell aktif="Rekap" judul="Rekap pesanan"
      keterangan="Ringkasan pesanan dan pendapatan per lapangan. Angka di sini dihitung ulang saat halaman dibuka (PRD 8.7)."
      aksi={<EksporCsvButton periodeLabel={periodeLabel} baris={baris} />}>
      <p className="text-[15px] font-bold text-muted">Periode: {periodeLabel}</p>

      {/* Kartu total */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
          <div className="text-[13px] font-bold uppercase tracking-wider text-muted">Total pesanan</div>
          <div className="mt-1.5 font-display text-[40px] font-bold leading-none tracking-[-0.03em]">{total.pesanan}</div>
        </div>
        <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
          <div className="text-[13px] font-bold uppercase tracking-wider text-muted">Total jam sewa</div>
          <div className="mt-1.5 font-display text-[40px] font-bold leading-none tracking-[-0.03em]">{total.jam} <span className="text-lg">jam</span></div>
        </div>
        <div className="rounded-[28px] border-[1.5px] border-line bg-mint p-6">
          <div className="text-[13px] font-bold uppercase tracking-wider text-[#0A6B3A]">Total pendapatan</div>
          <div className="mt-1.5 font-display text-[40px] font-bold leading-none tracking-[-0.03em] text-[#0A6B3A]">{formatRupiah(total.pendapatan)}</div>
        </div>
      </div>

      <div className="mt-6">
        <Tabel ariaLabel={`Rekap per lapangan ${periodeLabel}`} head={['Lapangan', 'Jenis olahraga', 'Pesanan', 'Jam sewa', 'Pendapatan']}>
          {baris.map((b) => (
            <tr key={b.lapangan} className="border-b border-line last:border-b-0 hover:bg-mist/60">
              <Td strong>{b.lapangan}</Td>
              <Td>{b.olahraga}</Td>
              <Td strong>{b.pesanan}</Td>
              <Td strong>{b.jam} jam</Td>
              <Td strong>{formatRupiah(b.pendapatan)}</Td>
            </tr>
          ))}
        </Tabel>
      </div>
      <Catatan>
        Lapangan dengan pendapatan tertinggi: <strong>{terlaris.lapangan}</strong> ({formatRupiah(terlaris.pendapatan)}).
        Pesanan yang dibatalkan tidak dihitung; hanya pesanan terkonfirmasi dan selesai (BR-13 konsisten).
      </Catatan>
    </AdminShell>
  );
}
