import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { BadgeStatus } from '@/components/status-pesanan';
import type { BarisAdminPesanan } from '@/lib/demo-fe';
import { formatRupiah, labelPanjang } from '@/lib/format';
import type { StatusPesanan } from '@/lib/slots';

const rentang = (b: { jamMulai: number; jamSelesai: number }) =>
  `${String(b.jamMulai).padStart(2, '0')}.00–${String(b.jamSelesai).padStart(2, '0')}.00`;

const STATUS: (StatusPesanan | 'semua')[] = [
  'semua', 'menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan', 'selesai', 'dibatalkan', 'ditolak', 'kedaluwarsa',
];
const LABEL: Record<(typeof STATUS)[number], string> = {
  semua: 'Semua', menunggu_pembayaran: 'Menunggu bayar', menunggu_verifikasi: 'Menunggu verifikasi',
  terkonfirmasi: 'Terkonfirmasi', pengajuan_pembatalan: 'Pengajuan batal', selesai: 'Selesai',
  dibatalkan: 'Dibatalkan', ditolak: 'Ditolak', kedaluwarsa: 'Kedaluwarsa',
};

/** Daftar semua pesanan admin (FR-ADM-08): pencarian q (kode/penyewa/lapangan) + filter status, keduanya di server. */
export function DaftarPesananView({ daftar, q, status }: { daftar: BarisAdminPesanan[]; q: string; status: StatusPesanan | 'semua' }) {
  const kunci = q.trim().toLowerCase();
  const terlihat = daftar.filter((b) =>
    (status === 'semua' || b.status === status) &&
    (!kunci || [b.kode, b.penyewa, b.lapanganNama].some((x) => x.toLowerCase().includes(kunci))));

  return (
    <AdminShell aktif="Pesanan" judul="Daftar pesanan"
      keterangan="Seluruh pesanan dari semua penyewa. Gunakan pencarian dan filter status untuk menelusuri (PRD 8.6).">
      {/* Pencarian server-side (FE dulu): submit form GET ke /admin/pesanan?q=… */}
      <form role="search" aria-label="Cari pesanan" action="/admin/pesanan" method="get" className="flex flex-wrap items-center gap-2.5">
        <input type="search" name="q" defaultValue={q} placeholder="Cari kode, penyewa, atau lapangan…"
          aria-label="Kata kunci pencarian"
          className="h-11 w-[320px] max-w-full rounded-full border-[1.5px] border-line bg-white px-5 text-[15px] font-medium focus:border-brand focus:outline-none" />
        <button type="submit" className="btn h-11 cursor-pointer rounded-full bg-ink px-5 text-[14px] font-bold text-white">Cari</button>
      </form>

      {/* Pil status dipbangun manual agar nilai ?q= tetap terbawa saat berpindah status. */}
      <nav aria-label="Filter status" className="mt-5 flex flex-wrap gap-2.5">
        {STATUS.map((s) => {
          const on = s === status;
          const param = new URLSearchParams();
          if (q) param.set('q', q);
          if (s !== 'semua') param.set('status', s);
          const qs = param.toString();
          return (
            <Link key={s} href={`/admin/pesanan${qs ? '?' + qs : ''}`} aria-current={on ? 'true' : undefined}
              className={`flex h-11 items-center rounded-full border-[1.5px] px-5 text-[14px] font-bold no-underline ${on ? 'border-ink bg-ink text-white' : 'border-line bg-mist text-ink'}`}>
              {LABEL[s]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {terlihat.length === 0 ? (
          <Tabel ariaLabel="Daftar pesanan" head={['Kode']} kosong={`Tidak ada pesanan yang cocok${kunci ? ` dengan kata kunci “${q}”` : ''}.`} />
        ) : (
          <Tabel ariaLabel="Daftar pesanan" head={['Kode', 'Penyewa', 'Lapangan', 'Jadwal main', 'Total', 'Status']}>
            {terlihat.map((b) => (
              <tr key={b.kode} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                <Td strong>
                  <Link href={`/riwayat/${b.kode}`} className="font-display font-bold text-ink underline hover:text-brand">{b.kode}</Link>
                </Td>
                <Td>{b.penyewa}</Td>
                <Td strong>{b.lapanganNama}</Td>
                <Td>{labelPanjang(b.tanggal)}<br /><span className="text-[13px] text-muted">{rentang(b)} · {b.jumlahJam} jam</span></Td>
                <Td strong>{formatRupiah(b.totalHarga)}</Td>
                <Td><BadgeStatus status={b.status} /></Td>
              </tr>
            ))}
          </Tabel>
        )}
      </div>
      <Catatan>
        {terlihat.length} dari {daftar.length} pesanan ditampilkan. Harga dikunci per pesanan (BR-06); perubahan tarif tidak mengubah total di sini.
      </Catatan>
    </AdminShell>
  );
}
