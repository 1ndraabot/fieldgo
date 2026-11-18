'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatHitungMundur } from '@/lib/format';
import { Banner, TombolUtama } from '@/components/auth/ui';

type Props = { lapanganId: number; tanggal: string; mulai: number; selesai: number };
type Galat = { jenis: 'tersedia' | 'verifikasi' | 'dibatasi' | 'lain'; pesan: string; tunggu?: number };

/** Tombol konfirmasi (FR-ORD-03/04): server memeriksa ulang slot, menghitung harga, lalu mengembalikan kode pesanan. */
export function KonfirmasiPesanan({ lapanganId, tanggal, mulai, selesai }: Props) {
  const router = useRouter();
  const [kirim, setKirim] = useState(false);
  const [galat, setGalat] = useState<Galat | null>(null);

  async function konfirmasi() {
    setKirim(true);
    setGalat(null);
    try {
      const res = await fetch('/api/pesan', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lapanganId, tanggal, mulai, selesai }),
      });
      const b = await res.json();
      if (b.ok) {
        router.push(`/pesanan/${encodeURIComponent(b.kode)}/bayar`);
        router.refresh();
        return;
      }
      if (b.kode === 'TIDAK_TERSEDIA') setGalat({ jenis: 'tersedia', pesan: 'Slot ini baru saja diambil orang lain. Pilih jam lain di kalender.' });
      else if (b.kode === 'BELUM_TERVERIFIKASI') setGalat({ jenis: 'verifikasi', pesan: 'Verifikasi email dulu sebelum memesan.' });
      else if (b.kode === 'DIBATASI') setGalat({ jenis: 'dibatasi', pesan: 'Terlalu banyak percobaan. Coba lagi dalam', tunggu: b.ulangiDetik });
      else if (b.kode === 'VALIDASI') setGalat({ jenis: 'lain', pesan: Object.values(b.galat ?? {})[0] as string ?? 'Periksa kembali pilihan slotmu.' });
      else setGalat({ jenis: 'lain', pesan: 'Belum bisa terhubung ke server. Coba lagi sebentar lagi.' });
    } catch {
      setGalat({ jenis: 'lain', pesan: 'Belum bisa terhubung ke server. Coba lagi sebentar lagi.' });
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {galat && (
        <Banner nada={galat.jenis === 'tersedia' ? 'merah' : 'amber'} ikon={galat.jenis === 'tersedia' ? 'alert' : 'info'} role="alert">
          {galat.pesan}{galat.jenis === 'dibatasi' && galat.tunggu ? <> <b>{formatHitungMundur(galat.tunggu)}</b>.</> : null}
          {galat.jenis === 'tersedia' && (
            <> <Link href={`/lapangan/${lapanganId}?tanggal=${tanggal}`} className="font-bold underline">Buka kalender</Link>.</>
          )}
          {galat.jenis === 'verifikasi' && (
            <> <Link href="/verifikasi-email" className="font-bold underline">Kirim tautan verifikasi</Link>.</>
          )}
        </Banner>
      )}
      <TombolUtama type="button" onClick={konfirmasi} disabled={kirim}>
        {kirim ? 'Menahan slot…' : 'Konfirmasi pesanan'}
      </TombolUtama>
      <p className="text-center text-[13px] font-medium text-muted">
        Slot langsung ditahan untukmu. Selesaikan pembayaran sebelum batas waktu agar tidak dilepas.
      </p>
    </div>
  );
}
