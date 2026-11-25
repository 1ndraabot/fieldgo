import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { BadgeStatus } from '@/components/status-pesanan';
import type { DaftarPesananAdmin } from '@/lib/admin/pesanan/data';
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

/** Daftar semua pesanan admin (FR-ADM-08): pencarian + filter status di server, 50/halaman. */
export function DaftarPesananView({ data, q, status }: { data: DaftarPesananAdmin; q: string; status: StatusPesanan | 'semua' }) {
  const hrefDengan = (halaman: number) => {
    const param = new URLSearchParams();
    if (q) param.set('q', q);
    if (status !== 'semua') param.set('status', status);
    if (halaman > 1) param.set('halaman', String(halaman));
    const qs = param.toString();
    return `/admin/pesanan${qs ? '?' + qs : ''}`;
  };

  return (
    <AdminShell aktif="Pesanan" judul="Daftar pesanan"
      keterangan="Seluruh pesanan dari semua penyewa. Gunakan pencarian dan filter status untuk menelusuri.">
      {/* Pencarian server-side: submit form GET ke /admin/pesanan?q=… */}
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
        {data.baris.length === 0 ? (
          <Tabel ariaLabel="Daftar pesanan" head={['Kode']} kosong={`Tidak ada pesanan yang cocok${q ? ` dengan kata kunci “${q}”` : ''}.`} />
        ) : (
          <Tabel ariaLabel="Daftar pesanan" head={['Kode', 'Penyewa', 'Lapangan', 'Jadwal main', 'Total', 'Status']}>
            {data.baris.map((b) => (
              <tr key={b.kode} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                <Td strong>
                  <Link href={`/admin/pesanan/${b.kode}`} className="font-display font-bold text-ink underline hover:text-brand">{b.kode}</Link>
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

      {/* Pagination server-side: ?halaman=n membawa q dan status */}
      {data.totalHalaman > 1 && (
        <nav aria-label="Navigasi halaman" className="mt-5 flex items-center justify-between">
          {data.halaman > 1 ? (
            <Link href={hrefDengan(data.halaman - 1)} className="flex h-11 items-center rounded-full border-[1.5px] border-line bg-mist px-5 text-[14px] font-bold text-ink no-underline">
              ← Sebelumnya
            </Link>
          ) : <span />}
          <span className="text-[13px] font-semibold text-muted">Halaman {data.halaman} dari {data.totalHalaman}</span>
          {data.halaman < data.totalHalaman ? (
            <Link href={hrefDengan(data.halaman + 1)} className="flex h-11 items-center rounded-full border-[1.5px] border-line bg-mist px-5 text-[14px] font-bold text-ink no-underline">
              Berikutnya →
            </Link>
          ) : <span />}
        </nav>
      )}

      <Catatan>
        {data.total} pesanan cocok dengan filter; {data.baris.length} ditampilkan pada halaman {data.halaman}.
        Harga dikunci per pesanan; perubahan tarif tidak mengubah total di sini.
      </Catatan>
    </AdminShell>
  );
}
