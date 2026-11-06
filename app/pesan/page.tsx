import type { Metadata } from 'next';
import Link from 'next/link';
import { BannerVerifikasi } from '@/components/auth/BannerVerifikasi';
import { Header } from '@/components/Header';
import { formatJam, labelPanjang } from '@/lib/format';
import { wajibPenyewa } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Gelanggang — Pemesanan' };

type Params = Record<string, string | string[] | undefined>;
const angka = (v: string | string[] | undefined) => (typeof v === 'string' && /^\d{1,6}$/.test(v) ? Number(v) : null);

/**
 * PLACEHOLDER: halaman pemesanan sungguhan menyusul (FR-ORD).
 * Ada di sini untuk membuktikan alur FR-PUB-05: tamu menekan "Pesan" → /masuk → kembali ke sini dengan slot yang sama.
 */
export default async function Pesan({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x);
  const qs = q.toString();
  const pengguna = await wajibPenyewa(`/pesan${qs ? `?${qs}` : ''}`);

  const lapangan = angka(sp.lapangan), mulai = angka(sp.mulai), selesai = angka(sp.selesai);
  const tanggal = typeof sp.tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal) ? sp.tanggal : null;
  const valid = lapangan && tanggal && mulai !== null && selesai !== null && mulai >= 6 && selesai <= 24 && selesai > mulai;
  const terverifikasi = pengguna.emailTerverifikasiPada !== null;

  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={{ nama: pengguna.nama }} />
      {!terverifikasi && <BannerVerifikasi />}
      <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-6 py-16">
        <h1 className="font-display text-4xl font-bold tracking-[-0.03em]">Pemesanan</h1>
        {valid && (
          <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Pilihan slotmu</div>
            <div className="mt-2 font-display text-xl font-bold">Lapangan #{lapangan}</div>
            <div className="mt-1 text-base font-medium">{labelPanjang(tanggal!)} · {formatJam(mulai!)}–{formatJam(selesai!)}</div>
          </div>
        )}
        {terverifikasi
          ? <p className="text-muted">Halaman pemesanan sedang disiapkan. Pilihan slotmu sudah tersimpan di alamat halaman ini.</p>
          : <p className="font-semibold text-[#5A3700]">Verifikasi email dulu sebelum memesan. <Link href="/verifikasi-email" className="font-bold underline">Kirim ulang tautan</Link></p>}
        <Link href="/" className="btn flex h-12 w-fit items-center rounded-full border-[1.5px] border-ink px-6 text-[15px] font-bold no-underline">Kembali ke beranda</Link>
      </main>
    </div>
  );
}
