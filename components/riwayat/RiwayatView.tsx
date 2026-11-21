import Link from 'next/link';
import { BadgeStatus } from '@/components/status-pesanan';
import { BannerVerifikasi } from '@/components/auth/BannerVerifikasi';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Icon } from '@/components/icons';
import type { BarisRiwayat } from '@/lib/demo-fe';
import { formatRupiah, labelPanjang } from '@/lib/format';
import type { StatusPesanan } from '@/lib/slots';

const pad = 'px-[clamp(16px,4.5vw,64px)]';
const FILTER: (StatusPesanan | 'semua')[] = [
  'semua', 'menunggu_pembayaran', 'menunggu_verifikasi', 'terkonfirmasi', 'pengajuan_pembatalan',
  'selesai', 'dibatalkan', 'ditolak', 'kedaluwarsa',
];
const LABEL: Record<(typeof FILTER)[number], string> = {
  semua: 'Semua', menunggu_pembayaran: 'Menunggu bayar', menunggu_verifikasi: 'Menunggu verifikasi',
  terkonfirmasi: 'Terkonfirmasi', pengajuan_pembatalan: 'Pengajuan batal', selesai: 'Selesai',
  dibatalkan: 'Dibatalkan', ditolak: 'Ditolak', kedaluwarsa: 'Kedaluwarsa',
};

/** Riwayat seluruh pesanan milik penyewa, terbaru dulu, dengan filter status (FR-HIS-02). */
export function RiwayatView({ pengguna, terverifikasi, daftar, statusAktif }: {
  pengguna: { nama: string }; terverifikasi: boolean; daftar: BarisRiwayat[]; statusAktif: StatusPesanan | 'semua';
}) {
  const terlihat = daftar.filter((b) => statusAktif === 'semua' || b.status === statusAktif);
  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={pengguna} aktif="Riwayat" />
      {!terverifikasi && <BannerVerifikasi />}
      <main className={`relative ${pad} pb-28 pt-10`}>
        <div aria-hidden="true" className="absolute right-[-100px] top-[-40px] size-[420px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div className="relative z-[1] mx-auto max-w-[1080px]">
          <h1 className="font-display text-[clamp(36px,5vw,56px)] font-bold leading-[1.1] tracking-[-0.04em]">
            Riwayat <span className="text-brand-2">pesanan</span>
          </h1>
          <p className="mt-3 max-w-[560px] text-base leading-relaxed text-muted">
            Seluruh pesananmu, terbaru dulu. Kode, lapangan, jadwal, total, dan status dalam satu daftar.
          </p>

          <nav aria-label="Filter status" className="mt-9 flex flex-wrap gap-2.5">
            {FILTER.map((f) => {
              const aktif = f === statusAktif;
              const href = f === 'semua' ? '/riwayat' : `/riwayat?status=${f}`;
              return (
                <Link key={f} href={href} aria-current={aktif ? 'true' : undefined}
                  className={`flex h-11 items-center rounded-full border-[1.5px] px-5 text-[14px] font-bold no-underline ${aktif ? 'border-ink bg-ink text-white' : 'border-line bg-mist text-ink'}`}>
                  {LABEL[f]}
                </Link>
              );
            })}
          </nav>

          {terlihat.length === 0 ? (
            <div className="mt-10 rounded-[28px] border-[1.5px] border-dashed border-line bg-mist px-6 py-10 text-center">
              <p className="text-base text-muted">Belum ada pesanan dengan status ini.</p>
              <Link href="/#lapangan" className="mt-3 inline-block font-bold text-brand underline">Pilih lapangan</Link>
            </div>
          ) : (
            <div className="mt-10 overflow-x-auto rounded-[28px] border-[1.5px] border-line bg-white">
              <table className="w-full min-w-[760px] text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line bg-mist text-[12px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-3.5 font-bold">Kode</th>
                    <th className="px-5 py-3.5 font-bold">Lapangan</th>
                    <th className="px-5 py-3.5 font-bold">Jadwal main</th>
                    <th className="px-5 py-3.5 font-bold">Total</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 text-right font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {terlihat.map((b) => (
                    <tr key={b.kode} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                      <td className="px-5 py-4 font-display font-bold">{b.kode}</td>
                      <td className="px-5 py-4 font-semibold">{b.lapanganNama}</td>
                      <td className="px-5 py-4 text-muted">
                        {labelPanjang(b.tanggal)}<br />
                        <span className="text-[13px]">{String(b.jamMulai).padStart(2, '0')}.00–{String(b.jamSelesai).padStart(2, '0')}.00 · {b.jumlahJam} jam</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-brand">{formatRupiah(b.totalHarga)}</td>
                      <td className="px-5 py-4"><BadgeStatus status={b.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/riwayat/${b.kode}`} aria-label={`Detail pesanan ${b.kode}`}
                          className="btn inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-bold text-white no-underline">
                          Detail <Icon name="kanan" size={14} stroke="#C6F432" width={2.6} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer olahragaList={['Futsal', 'Badminton', 'Basket', 'Tenis', 'Mini Soccer']} />
    </div>
  );
}
