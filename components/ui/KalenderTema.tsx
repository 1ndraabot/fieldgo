'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { hariKe, labelBulan, wibSekarang } from '@/lib/format';
import { Icon } from '../icons';

const HARI_SINGKAT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

type Props = { nilai: string; ubah: (tanggal: string) => void; min: string; maks: string };

/** Satu kotak hari pada kalender. */
function Hari({ iso, nilai, min, maks, ubah }: { iso: string; min: string; maks: string } & Props) {
  const hariIni = wibSekarang(new Date()).tanggal;
  const mati = iso < min || iso > maks;
  const dipilih = iso === nilai;
  return (
    <button type="button" disabled={mati} aria-pressed={dipilih}
      aria-label={`${Number(iso.slice(8))} ${labelBulan(iso.slice(0, 7))}`}
      onClick={() => ubah(iso)}
      className={`mx-auto flex size-9 cursor-pointer items-center justify-center rounded-full border-0 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        dipilih ? 'bg-ink text-white' : iso === hariIni ? 'bg-mint text-[#0A6B3A]' : 'bg-transparent hover:bg-mist'
      }`}>
      {Number(iso.slice(8))}
    </button>
  );
}

/** Panel kalender bulanan (Senin–Minggu). Controlled penuh: nilai & ubah dari pemakai. */
export function PanelKalender({ nilai, ubah, min, maks }: Props) {
  const [bulan, setBulan] = useState(() => nilai.slice(0, 7));
  const jumlahHari = new Date(Date.UTC(Number(bulan.slice(0, 4)), Number(bulan.slice(5, 7)), 0)).getUTCDate();
  const geser = hariKe(bulan + '-01') - 1; // Senin = kolom pertama
  const sel = [
    ...Array.from({ length: geser }, () => null as string | null),
    ...Array.from({ length: jumlahHari }, (_, i) => `${bulan}-${String(i + 1).padStart(2, '0')}`),
  ];
  const bisaMundur = bulan > min.slice(0, 7);
  const bisaMaju = bulan < maks.slice(0, 7);
  const geserBulan = (n: number) => {
    const d = new Date(bulan + '-01T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() + n);
    setBulan(d.toISOString().slice(0, 7));
  };
  return (
    <div className="w-[290px]">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => geserBulan(-1)} disabled={!bisaMundur} aria-label="Bulan sebelumnya"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30">
          <span className="inline-flex rotate-180"><Icon name="kanan" size={17} stroke="#0B2B1E" width={2.4} /></span>
        </button>
        <span className="font-display text-[15px] font-bold">{labelBulan(bulan)}</span>
        <button type="button" onClick={() => geserBulan(1)} disabled={!bisaMaju} aria-label="Bulan berikutnya"
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-mist disabled:cursor-not-allowed disabled:opacity-30">
          <Icon name="kanan" size={17} stroke="#0B2B1E" width={2.4} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {HARI_SINGKAT.map((h) => (
          <span key={h} className="text-[11px] font-bold uppercase tracking-wide text-muted">{h}</span>
        ))}
        {sel.map((iso, i) =>
          iso === null ? <span key={`kosong-${i}`} /> : <Hari key={iso} iso={iso} nilai={nilai} ubah={ubah} min={min} maks={maks} />,
        )}
      </div>
    </div>
  );
}

/**
 * Tombol pemicu + popover kalender. `isi` = konten tombol (bebas, styling lewat `className`).
 * Tutup otomatis saat memilih tanggal, klik di luar, atau menekan Escape.
 */
export function PemilihKalender({ nilai, ubah, min, maks, isi, className = '', sisi = 'kiri' }: Props & {
  isi: ReactNode; className?: string; sisi?: 'kiri' | 'kanan';
}) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const klik = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const tombol = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('pointerdown', klik);
    document.addEventListener('keydown', tombol);
    return () => {
      document.removeEventListener('pointerdown', klik);
      document.removeEventListener('keydown', tombol);
    };
  }, [buka]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={className} aria-haspopup="dialog" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
        {isi}
      </button>
      {buka && (
        <div role="dialog" aria-label="Pilih tanggal"
          className={`absolute top-[calc(100%+10px)] z-40 rounded-[24px] border-[1.5px] border-line bg-white p-4 shadow-[0_24px_48px_rgba(8,44,28,.25)] ${sisi === 'kanan' ? 'right-0' : 'left-0'}`}>
          <PanelKalender nilai={nilai} ubah={(t) => { ubah(t); setBuka(false); }} min={min} maks={maks} />
        </div>
      )}
    </div>
  );
}
