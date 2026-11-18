import type { Metadata } from 'next';
import Link from 'next/link';
import { BannerVerifikasi } from '@/components/auth/BannerVerifikasi';
import { Banner } from '@/components/auth/ui';
import { Header } from '@/components/Header';
import { KonfirmasiPesanan } from '@/components/pesan/KonfirmasiPesanan';
import { wajibPenyewa } from '@/lib/auth/session';
import { formatJam, formatRupiah, labelPanjang } from '@/lib/format';
import { labelBatasBayar } from '@/lib/jadwal';
import { getPesanData } from '@/lib/pesan/data';

export const metadata: Metadata = { title: 'FieldGo — Konfirmasi pesanan' };
export const dynamic = 'force-dynamic'; // ketersediaan slot dan batas bayar harus selalu terbaru

type Params = Record<string, string | string[] | undefined>;
const angka = (v: string | string[] | undefined) => (typeof v === 'string' && /^\d{1,6}$/.test(v) ? Number(v) : null);

/** Layar konfirmasi pesanan (FR-ORD-02): lapangan, tanggal, rincian harga per jam, total, batas bayar. */
export default async function Pesan({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  const qs = q.toString();
  const pengguna = await wajibPenyewa(`/pesan${qs ? `?${qs}` : ''}`); // tamu → /masuk lalu kembali dengan slot yang sama

  const lapanganId = angka(sp.lapangan), mulai = angka(sp.mulai), selesai = angka(sp.selesai);
  const tanggal = typeof sp.tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal) ? sp.tanggal : null;
  const sah = lapanganId !== null && tanggal !== null && mulai !== null && selesai !== null && mulai >= 6 && selesai <= 24 && selesai > mulai;
  const data = sah ? await getPesanData({ lapanganId, tanggal, mulai, selesai }) : null;
  const terverifikasi = pengguna.emailTerverifikasiPada !== null;

  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={{ nama: pengguna.nama }} />
      {!terverifikasi && <BannerVerifikasi />}
      <main className="mx-auto flex max-w-[720px] flex-col gap-5 px-6 py-14">
        <div>
          <h1 className="font-display text-[clamp(30px,4vw,44px)] font-bold leading-[1.12] tracking-[-0.03em]">
            Konfirmasi <span className="text-brand-2">pesanan</span>
          </h1>
          <p className="mt-2 text-[15px] text-muted">Periksa pilihanmu. Slot ditahan setelah kamu menekan konfirmasi.</p>
        </div>

        {!sah || !data ? (
          <>
            <Banner nada="merah" ikon="alert">
              Pilihan slot tidak lengkap atau tidak valid. Buka kalender lapangan dan pilih jam lagi.
            </Banner>
            <Link href="/" className="btn flex h-12 w-fit items-center rounded-full border-[1.5px] border-ink px-6 text-[15px] font-bold no-underline">
              Kembali ke beranda
            </Link>
          </>
        ) : (
          <>
            <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">{data.lapangan.olahraga}</div>
                  <div className="mt-1 font-display text-2xl font-bold">{data.lapangan.nama}</div>
                  <div className="mt-1 text-sm text-muted">{data.lapangan.alamat}</div>
                </div>
                <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0A6B3A]">{labelPanjang(data.tanggal)}</span>
              </div>
              <p className="mt-4 text-[17px] font-semibold">
                {formatJam(data.mulai)}–{formatJam(data.selesai)} · {data.selesai - data.mulai} jam
              </p>

              <table className="mt-5 w-full text-left text-[15px]">
                <thead>
                  <tr className="text-[12px] uppercase tracking-wider text-muted">
                    <th className="pb-2 font-bold">Jam</th>
                    <th className="pb-2 text-right font-bold">Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jam.map((j) => (
                    <tr key={j.jam} className="border-t border-line">
                      <td className="py-2.5 font-medium">{formatJam(j.jam)}–{formatJam(j.jam + 1)}</td>
                      <td className="py-2.5 text-right font-semibold">
                        {j.tersedia ? formatRupiah(j.harga) : <span className="text-[#B42328]">sudah terisi</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-[1.5px] border-ink">
                    <td className="py-3 font-display text-lg font-bold">Total</td>
                    <td className="py-3 text-right font-display text-lg font-bold text-brand">{formatRupiah(data.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-[22px] border-[1.5px] border-line bg-white px-5 py-4 text-[14px] font-medium text-muted">
              Batas bayar: <b className="text-ink">{labelBatasBayar(data.batasBayarPada)}</b> (24 jam sejak pesanan dibuat atau sebelum jam main, mana yang lebih dulu).
            </div>

            {!data.tersedia ? (
              <>
                <Banner nada="merah" ikon="alert">
                  Sebagian jam yang kamu pilih sudah terisi. Pilih jam lain — status di kalender selalu terbaru.
                </Banner>
                <Link href={`/lapangan/${data.lapangan.id}?tanggal=${data.tanggal}`}
                  className="btn flex h-14 w-full items-center justify-center rounded-full bg-brand text-base font-bold text-white no-underline">
                  Pilih slot lain
                </Link>
              </>
            ) : terverifikasi ? (
              <KonfirmasiPesanan lapanganId={data.lapangan.id} tanggal={data.tanggal} mulai={data.mulai} selesai={data.selesai} />
            ) : (
              <Banner nada="amber" ikon="info">
                Verifikasi email dulu sebelum memesan. <Link href="/verifikasi-email" className="font-bold underline">Kirim tautan verifikasi</Link>.
              </Banner>
            )}

            <Link href={`/lapangan/${data.lapangan.id}?tanggal=${data.tanggal}`} className="text-center text-[14px] font-bold text-muted underline">
              Ubah pilihan slot
            </Link>
          </>
        )}
      </main>
    </div>
  );
}

