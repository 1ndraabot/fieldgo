import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { BatalForm } from '@/components/riwayat/BatalForm';
import { bacaPengaturan } from '@/lib/admin/pengaturan/data';
import { wajibPenyewa } from '@/lib/auth/session';
import { formatJam, labelPanjang } from '@/lib/format';
import { getDetailPesanan } from '@/lib/riwayat/data';
import { bisaAjukanBatal } from '@/lib/riwayat/rules';

export const metadata: Metadata = { title: 'FieldGo — Ajukan pembatalan' };
export const dynamic = 'force-dynamic';

const KODE = /^[A-Za-z0-9-]{4,40}$/;

export default async function HalamanBatal({ params }: { params: Promise<{ kode: string }> }) {
  const pengguna = await wajibPenyewa('/riwayat'); // halaman khusus penyewa (FR-PUB-05)
  const { kode } = await params;
  if (!KODE.test(kode)) notFound();
  const now = new Date();
  const data = await getDetailPesanan(kode, pengguna.id, now);
  if (!data) notFound();

  // FR-CAN-01: form hanya untuk pesanan Terkonfirmasi sebelum batas pembatalan; server memeriksa ulang saat kirim.
  if (!bisaAjukanBatal(data.status, data.tanggal, now, (await bacaPengaturan()).batasPembatalanHari)) redirect(`/riwayat/${data.kode}`);

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
            Pengajuan hanya untuk pesanan Terkonfirmasi sebelum batas pembatalan.
          </p>
          <div className="mt-7">
            <BatalForm kode={data.kode} lapanganNama={data.lapanganNama}
              jadwalLabel={`${labelPanjang(data.tanggal)} · ${formatJam(data.jamMulai)}–${formatJam(data.jamSelesai)}`}
              total={data.totalHarga} nama={pengguna.nama} kontak={pengguna.nomorKontak} />
          </div>
        </div>
      </main>
    </div>
  );
}
