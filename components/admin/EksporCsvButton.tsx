'use client';

import type { BarisRekap } from '@/lib/demo-fe';
import { Icon } from '@/components/icons';

/** Unduh rekap sebagai CSV (FR-ADM-09). FE dulu: CSV dibangun dari data dummy di klien; data asli menyusul. */
export default function EksporCsvButton({ periodeLabel, baris }: { periodeLabel: string; baris: BarisRekap[] }) {
  function unduh() {
    const barisCsv = [
      ['Lapangan', 'Jenis olahraga', 'Pesanan', 'Jam sewa', 'Pendapatan'],
      ...baris.map((b) => [b.lapangan, b.olahraga, String(b.pesanan), String(b.jam), String(b.pendapatan)]),
    ];
    // Titik koma sebagai pemisah agar aman untuk Excel locale Indonesia.
    const csv = `\uFEFFperiode;${periodeLabel}\n${barisCsv.map((r) => r.join(';')).join('\n')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-gelanggang-${periodeLabel.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={unduh} aria-label="Unduh rekap sebagai CSV"
      className="btn inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-ink bg-white px-6 text-[14px] font-bold">
      <Icon name="upload" size={16} stroke="#0B2B1E" width={2.4} />Ekspor CSV
    </button>
  );
}
