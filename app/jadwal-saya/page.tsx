import type { Metadata } from 'next';
import { JadwalSayaView } from '@/components/JadwalSayaView';
import { wajibPenyewa } from '@/lib/auth/session';
import { getJadwalSaya } from '@/lib/jadwal-data';

export const metadata: Metadata = { title: 'Gelanggang — Jadwal saya' };
export const dynamic = 'force-dynamic'; // sisa waktu bayar dan jadwal berjalan harus selalu terbaru

export default async function JadwalSaya() {
  const pengguna = await wajibPenyewa('/jadwal-saya'); // tamu → /masuk?next=/jadwal-saya, lalu kembali ke sini
  const now = new Date();
  const { terkonfirmasi, menunggu } = await getJadwalSaya(pengguna.id, now); // hanya milik pengguna sesi ini
  return (
    <JadwalSayaView pengguna={{ nama: pengguna.nama }} terverifikasi={pengguna.emailTerverifikasiPada !== null}
      terkonfirmasi={terkonfirmasi} menunggu={menunggu} now={now} />
  );
}
