import type { StatusPesanan } from '@/lib/slots';

// Warna status pesanan menurut kelompok keadaan (PRD 10.3): kuning = menunggu, hijau = aman,
// merah = buntu, abu = selesai/dibatalkan, teal = selesai dinilai. Label Indonesia wajib tampil
// bersama warna. Nilai hex di sini setara tabel status di docs/Style.md §1 (pengecualian warna status).
export const STATUS_PESANAN: Record<StatusPesanan, { label: string; bg: string; fg: string }> = {
  menunggu_pembayaran: { label: 'Menunggu pembayaran', bg: '#FFF1D6', fg: '#7A4B00' },
  menunggu_verifikasi: { label: 'Menunggu verifikasi', bg: '#FFF1D6', fg: '#7A4B00' },
  terkonfirmasi: { label: 'Terkonfirmasi', bg: '#DDF7E8', fg: '#0A6B3A' },
  pengajuan_pembatalan: { label: 'Pengajuan pembatalan', bg: '#FFF1D6', fg: '#7A4B00' },
  ditolak: { label: 'Ditolak', bg: '#FDE4E5', fg: '#B42328' },
  kedaluwarsa: { label: 'Kedaluwarsa', bg: '#E3EAE6', fg: '#4F6358' },
  dibatalkan: { label: 'Dibatalkan', bg: '#E3EAE6', fg: '#4F6358' },
  selesai: { label: 'Selesai', bg: '#E6FBF7', fg: '#0B5E52' },
};

/** Badge status pesanan: satu sumber untuk Riwayat, detail, dan panel admin. */
export function BadgeStatus({ status }: { status: StatusPesanan }) {
  const s = STATUS_PESANAN[status];
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}
