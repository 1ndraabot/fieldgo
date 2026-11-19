import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FieldGo — Halaman tidak ditemukan' };

/** Halaman 404: dipakai juga saat lapangan nonaktif tidak lagi tampil di publik (BR-17). */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-bold text-[#0A6B3A]">
        404 · Tidak ditemukan
      </span>
      <h1 className="font-display text-3xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted">
        Lapangan ini mungkin sudah dinonaktifkan atau tautannya salah. Lapangan yang dinonaktifkan tidak lagi tampil
        untuk penyewa, tetapi pesanan yang sudah berjalan tetap diproses.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn h-12 rounded-full border-0 bg-brand px-7 font-bold leading-[3rem] text-white no-underline">
          Lihat daftar lapangan
        </Link>
        <Link href="/" className="btn h-12 rounded-full border-[1.5px] border-ink bg-white px-7 font-bold leading-[2.8rem] text-ink no-underline">
          Ke beranda
        </Link>
      </div>
    </div>
  );
}
