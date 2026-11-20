import { redirect } from 'next/navigation';

// Halaman verifikasi lama dipindah: bukti transfer manual kini di alur pembayaran penyewa,
// putusan pembatalan/refund ada di /admin/pembayaran (FR-ADM-06/07).
export default function AdminVerifikasi() {
  redirect('/admin/pembayaran');
}
