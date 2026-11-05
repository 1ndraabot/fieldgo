import type { ReactNode } from 'react';
import type { Ilustrasi } from '@/lib/beranda';

// Palet kartu dari desain; dipakai bergilir menurut urutan lapangan agar warna stabil saat difilter.
export const PALET = [
  { base: '#22C06B', line: '#FFFFFF', terang: false },
  { base: '#C6F432', line: '#0B2B1E', terang: true },
  { base: '#1C5A40', line: '#C6F432', terang: false },
  { base: '#A7F0E0', line: '#0B2B1E', terang: true },
  { base: '#16A05A', line: '#FFFFFF', terang: false },
  { base: '#DDF7E8', line: '#0A6B3A', terang: true },
];

export function CourtLines({ jenis, label }: { jenis: Ilustrasi; label?: string }) {
  return (
    <svg viewBox="0 0 416 300" preserveAspectRatio="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth="3">
      <rect x="30" y="30" width="356" height="240" rx="8" />
      {jenis === 'futsal' && <><path d="M208 30v240" /><circle cx="208" cy="150" r="54" /><circle cx="208" cy="150" r="4" fill="currentColor" /><rect x="30" y="90" width="57" height="120" /><rect x="329" y="90" width="57" height="120" /></>}
      {jenis === 'badminton' && <><path d="M208 30v240" strokeWidth="6" /><path d="M158 30v240M258 30v240M30 150h128M258 150h128M30 57h356M30 243h356" /></>}
      {jenis === 'basket' && <><path d="M208 30v240" /><circle cx="208" cy="150" r="45" /><rect x="30" y="96" width="72" height="108" /><rect x="314" y="96" width="72" height="108" /><circle cx="102" cy="150" r="27" /><circle cx="314" cy="150" r="27" /></>}
      {jenis === 'tenis' && <><path d="M208 30v240" strokeWidth="6" /><path d="M30 60h356M30 240h356M136 60v180M280 60v180M136 150h144" /></>}
    </svg>
  );
}

export function CourtSurface({ jenis, base, line, terang = false, label, className = '', children }: {
  jenis: Ilustrasi; base: string; line: string; terang?: boolean; label?: string; className?: string; children?: ReactNode;
}) {
  return (
    <div className={`${terang ? 'stripe-light' : 'stripe-dark'} ${className}`} style={{ backgroundColor: base, color: line }}>
      <CourtLines jenis={jenis} label={label} />
      {children}
    </div>
  );
}
