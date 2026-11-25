'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';

export type OpsiDropdown = { nilai: string; label: string };

/** Listbox bertema (pengganti <select> bawaan): tutup saat memilih, klik di luar, atau Escape. */
export function DropdownTema({ nilai, ubah, opsi, label = 'Pilihan', className = '' }: {
  nilai: string; ubah: (v: string) => void; opsi: OpsiDropdown[]; label?: string; className?: string;
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
  const terpilih = opsi.find((o) => o.nilai === nilai);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={`flex cursor-pointer items-center gap-1 ${className}`}
        aria-haspopup="listbox" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
        {terpilih?.label ?? 'Semua'}
        <Icon name="bawah" size={15} stroke="#0B2B1E" width={2.4} />
      </button>
      {buka && (
        <ul role="listbox" aria-label={label}
          className="absolute left-0 top-[calc(100%+10px)] z-40 m-0 max-h-72 min-w-[180px] list-none overflow-auto rounded-[18px] border-[1.5px] border-line bg-white p-1.5 shadow-[0_24px_48px_rgba(8,44,28,.25)]">
          {opsi.map((o) => (
            <li key={o.nilai || '-'}>
              <button type="button" role="option" aria-selected={o.nilai === nilai}
                onClick={() => { ubah(o.nilai); setBuka(false); }}
                className={`w-full cursor-pointer whitespace-nowrap rounded-[12px] border-0 px-3.5 py-2 text-left text-[15px] font-semibold ${
                  o.nilai === nilai ? 'bg-mint text-[#0A6B3A]' : 'bg-transparent hover:bg-mist'
                }`}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
