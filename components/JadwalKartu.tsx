import Link from 'next/link';
import { formatJam, formatRupiah, labelPanjang, labelPendek } from '@/lib/format';
import { labelBatasBayar, labelSisaWaktu, type PesananJadwal } from '@/lib/jadwal';

const BADGE = {
  terkonfirmasi: { teks: 'Terkonfirmasi', kelas: 'bg-mint text-[#0A6B3A]', titik: 'bg-brand' },
  menunggu_pembayaran: { teks: 'Menunggu pembayaran', kelas: 'bg-[#FFF1D6] text-[#7A4B00]', titik: 'bg-[#F5A524]' },
} as const;

export function JadwalKartu({ p, now }: { p: PesananJadwal; now: Date }) {
  const [hari, sisa] = labelPendek(p.tanggal).split(', '); // "Sab", "7 Nov"
  const [tgl, bln] = sisa.split(' ');
  const b = BADGE[p.status as keyof typeof BADGE];
  return (
    <article className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[32px] border-[1.5px] border-line bg-white p-5 shadow-[0_16px_36px_rgba(8,44,28,.08)]">
      <div aria-hidden="true" className="flex size-[84px] shrink-0 flex-col items-center justify-center rounded-[24px] bg-ink text-white">
        <span className="text-xs font-bold uppercase tracking-wider text-lime">{hari}</span>
        <span className="font-display text-[32px] font-extrabold leading-none">{tgl}</span>
        <span className="text-xs font-semibold text-white/80">{bln}</span>
      </div>
      <div className="min-w-[200px] flex-[1_1_220px]">
        <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]">{p.lapanganNama}</h3>
        <div className="mt-1 text-base font-semibold">
          {labelPanjang(p.tanggal)} · {formatJam(p.jamMulai)}–{formatJam(p.jamSelesai)}{' '}
          <span className="font-medium text-muted">({p.jumlahJam} jam)</span>
        </div>
        <div className="mt-1 text-sm font-medium text-muted">{p.kode}</div>
      </div>
      <div className="flex flex-col items-end gap-2 max-[640px]:items-start">
        <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-bold ${b.kelas}`}>
          <span aria-hidden="true" className={`size-2 rounded-full ${b.titik}`} />{b.teks}
        </span>
        <div className="font-display text-xl font-bold text-brand">{formatRupiah(p.totalHarga)}</div>
      </div>
      {p.status === 'menunggu_pembayaran' && (
        <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-[20px] bg-[#FFF1D6] px-5 py-3.5 text-[15px] font-semibold text-[#5A3700]">
          <span>Batas bayar {labelBatasBayar(p.batasBayarPada)} · sisa {labelSisaWaktu(p.batasBayarPada, now)}</span>
          <Link href={`/pesanan/${p.kode}/bayar`} className="btn rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white no-underline">Bayar sekarang</Link>
        </div>
      )}
    </article>
  );
}
