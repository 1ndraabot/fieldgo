'use client';

import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/icons';

export const inp = (galat?: string) =>
  `h-[54px] w-full rounded-[18px] border-[1.5px] px-[18px] text-base font-medium focus:border-brand focus:shadow-[0_0_0_4px_rgba(34,192,107,.2)] focus:outline-none ${
    galat ? 'border-[#B42328] bg-[#FFFAFA]' : 'border-line bg-white'
  }`;

const NADA = {
  merah: 'border-[#E5484D] bg-[#FDE4E5] text-[#7A1519]',
  amber: 'border-[#F5A524] bg-[#FFF1D6] text-[#5A3700]',
  teal: 'border-[#2DD4BF] bg-[#E6FBF7] text-[#0B5E52]',
} as const;

export function Banner({ nada, ikon, role = 'alert', children }: { nada: keyof typeof NADA; ikon: IconName; role?: 'alert' | 'status' | 'note'; children: ReactNode }) {
  return (
    <div role={role} className={`flex items-start gap-3.5 rounded-[22px] border-[1.5px] px-5 py-4 text-[15px] font-semibold leading-normal ${NADA[nada]}`}>
      <span className="mt-px shrink-0"><Icon name={ikon} size={20} /></span>
      <span>{children}</span>
    </div>
  );
}

export function Field({ id, label, galat, children }: { id: string; label: string; galat?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      {children}
      {galat && <span id={`${id}-galat`} role="alert" className="text-[13px] font-bold text-[#B42328]">{galat}</span>}
    </div>
  );
}

type TeksProps = { id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string; galat?: string; type?: string };

export function TeksInput({ id, value, onChange, autoComplete, placeholder, galat, type = 'text' }: TeksProps) {
  return (
    <input id={id} name={id} type={type} autoComplete={autoComplete} placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)} aria-invalid={galat ? true : undefined}
      aria-describedby={galat ? `${id}-galat` : undefined} className={inp(galat)} />
  );
}

export function PasswordInput({ id, value, onChange, autoComplete, placeholder, galat }: Omit<TeksProps, 'type'>) {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="relative flex items-center">
      <input id={id} name={id} type={lihat ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)} aria-invalid={galat ? true : undefined}
        aria-describedby={galat ? `${id}-galat` : undefined} className={`${inp(galat)} pr-[96px]`} />
      <button type="button" onClick={() => setLihat((v) => !v)} aria-pressed={lihat}
        aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        className="absolute right-2 h-[38px] cursor-pointer rounded-xl border-0 bg-mint px-3.5 text-[13px] font-bold text-[#0A6B3A]">
        {lihat ? 'Sembunyi' : 'Tampil'}
      </button>
    </div>
  );
}

export function TombolUtama({ disabled, children }: { disabled?: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={disabled}
      className="btn flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-brand px-7 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
      {children}
      <span className="-mr-[18px] flex size-9 items-center justify-center rounded-full bg-lime"><Icon name="kanan" size={16} stroke="#0B2B1E" width={2.6} /></span>
    </button>
  );
}

export function Judul({ kata, hijau, children }: { kata: string; hijau: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[clamp(34px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.04em]">{kata} <span className="text-brand-2">{hijau}</span></h1>
      <p className="mt-2.5 text-base leading-relaxed text-muted">{children}</p>
    </div>
  );
}
