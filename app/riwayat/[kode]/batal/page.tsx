import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BatalForm } from '@/components/riwayat/BatalForm';
import { DEMO_PENGGUNA } from '@/lib/demo';
import { getDetailPesanan } from '@/lib/demo-fe';
import { formatRupiah, labelPanjang } from '@/lib/format';

export const metadata: Metadata = { title: 'Gelanggang — Ajukan pembatalan' };

const KODE = /^[A-Za-z0-9-]{4,40}$/;

// FE dulu: dummy tanpa guard. Saat backend jadi: wajibPenyewa() + validasi H-1 di server (BR-12, FR-CAN-01).
export default async function HalamanBatal({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  if (!KODE.test(kode)) notFound();
  const data = getDetailPesanan(kode);
  if (!data) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col bg-white">
      <header className="px-[clamp(16px,4.5vw,64px)] py-5">
        <a href={`/riwayat/${data.kode}`} className="text-[15px] font-bold text-muted no-underline">← Kembali ke detail pesanan</a>
      </header>
      <main className="flex flex-1 items-start justify-center px-[clamp(16px,4.5vw,64px)] pb-20 pt-6">
        <div className="w-full max-w-[560px] rounded-[32px] border-[1.5px] border-line bg-white p-9 shadow-[0_24px_48px_rgba(8,44,28,.08)]">
          <h1 className="font-display text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.12] tracking-[-0.03em]">
            Ajukan <span className="text-brand-2">pembatalan</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Pengajuan hanya untuk pesanan Terkonfirmasi sebelum batas H-1. Setelah dikirim, slot tetap terisi
            sampai admin memutuskan (FR-CAN-03).
          </p>
          <div className="mt-7">
            <BatalForm kode={data.kode} lapanganNama={data.lapanganNama}
              jadwalLabel={`${labelPanjang(data.tanggal)} · ${String(data.jamMulai).padStart(2, '0')}.00–${String(data.jamSelesai).padStart(2, '0')}.00`}
              total={data.totalHarga} nama={DEMO_PENGGUNA.nama} kontak={DEMO_PENGGUNA.nomorKontak} />
          </div>
        </div>
      </main>
    </div>
  );
}
