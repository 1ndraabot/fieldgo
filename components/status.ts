import type { StatusSlot } from '@/lib/slots';

// Warna status slot sesuai desain; label selalu ditampilkan juga (legenda + aria-label), tidak hanya warna.
export const STATUS: Record<StatusSlot, { label: string; bg: string; fg: string }> = {
  tersedia: { label: 'Tersedia', bg: '#DDF7E8', fg: '#0A6B3A' },
  terisi: { label: 'Terisi', bg: '#FDE4E5', fg: '#B42328' },
  ditahan: { label: 'Ditahan', bg: '#FFF1D6', fg: '#7A4B00' },
  tidak_tersedia: { label: 'Tidak tersedia', bg: '#E3EAE6', fg: '#4F6358' },
};
