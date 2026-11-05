'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatJam, formatRentang, formatRupiah } from '@/lib/format';
import { toggleJam } from '@/lib/selection';
import type { SlotInfo } from '@/lib/slots';
import { Icon } from './icons';
import { STATUS } from './status';

type Props = { lapanganId: number; nama: string; tanggal: string; tanggalLabel: string; slot: SlotInfo[] };

export function SlotPicker({ lapanganId, nama, tanggal, tanggalLabel, slot }: Props) {
  const [sel, setSel] = useState<number[]>([]);
  const tersedia = slot.filter((s) => s.status === 'tersedia').map((s) => s.jam);
  const total = sel.reduce((n, j) => n + (slot.find((s) => s.jam === j)?.harga ?? 0), 0);
  // Harga di sini hanya tampilan; harga sebenarnya dihitung ulang server saat pesanan dibuat (BR-06).
  const href = sel.length ? `/pesan?lapangan=${lapanganId}&tanggal=${tanggal}&mulai=${sel[0]}&selesai=${sel[sel.length - 1] + 1}` : null;

  return (
    <div className="box-border w-[340px] max-w-[92%] rounded-[28px] border border-line bg-white p-[22px] text-left shadow-[0_24px_48px_rgba(8,44,28,.28)]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[17px] font-bold">{nama}</span>
        <span className="rounded-full bg-mint px-3 py-[5px] text-xs font-bold text-[#0A6B3A]">{tanggalLabel}</span>
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {slot.map((s) => {
          const dipilih = sel.includes(s.jam);
          const st = STATUS[s.status];
          return (
            <button key={s.jam} type="button" disabled={s.status !== 'tersedia'} aria-pressed={dipilih}
              aria-label={`${formatJam(s.jam)}, ${st.label}`}
              onClick={() => setSel((cur) => toggleJam(cur, s.jam, tersedia))}
              className="h-11 cursor-pointer rounded-[14px] border-0 text-sm font-bold disabled:cursor-not-allowed"
              style={{ background: dipilih ? '#0E8A4A' : st.bg, color: dipilih ? '#fff' : st.fg }}>
              {formatJam(s.jam)}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2.5">
        <div>
          <div className="text-xs font-medium text-muted" aria-live="polite">{formatRentang(sel)}</div>
          <div className="font-display text-[22px] font-bold text-brand">{formatRupiah(total)}</div>
        </div>
        {href ? (
          <Link href={href} aria-label="Lanjut memesan" className="btn flex size-12 items-center justify-center rounded-full bg-brand text-white"><Icon name="arrow" size={22} stroke="#fff" width={2.4} /></Link>
        ) : (
          <span aria-disabled="true" className="flex size-12 items-center justify-center rounded-full bg-brand text-white opacity-40"><Icon name="arrow" size={22} stroke="#fff" width={2.4} /></span>
        )}
      </div>
    </div>
  );
}
