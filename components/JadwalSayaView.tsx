import Link from 'next/link';
import type { ReactNode } from 'react';
import { BannerVerifikasi } from '@/components/auth/BannerVerifikasi';
import { Header } from '@/components/Header';
import { JadwalKartu } from '@/components/JadwalKartu';
import type { PesananJadwal } from '@/lib/jadwal';

function Bagian({ judul, jumlah, kosong, children }: { judul: string; jumlah: number; kosong: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={judul} className="mt-12">
      <div className="mb-5 flex items-center gap-3">
        <h2 className="font-display text-[26px] font-bold tracking-[-0.03em]">{judul}</h2>
        <span className="rounded-full bg-mist px-3 py-1 text-sm font-bold text-muted">{jumlah}</span>
      </div>
      {jumlah === 0
        ? <div className="rounded-[28px] border-[1.5px] border-dashed border-line bg-mist px-6 py-8 text-base text-muted">{kosong}</div>
        : <div className="flex flex-col gap-4">{children}</div>}
    </section>
  );
}

export function JadwalSayaView({ pengguna, terverifikasi, terkonfirmasi, menunggu, now }: {
  pengguna: { nama: string }; terverifikasi: boolean; terkonfirmasi: PesananJadwal[]; menunggu: PesananJadwal[]; now: Date;
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={pengguna} aktif="Jadwal saya" />
      {!terverifikasi && <BannerVerifikasi />}
      <main className="relative px-[clamp(16px,4.5vw,64px)] pb-28 pt-10">
        <div aria-hidden="true" className="absolute right-[-100px] top-[-40px] size-[420px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div aria-hidden="true" className="absolute bottom-[40px] left-[-140px] size-[360px] rounded-full bg-[#E6F9A6] opacity-60 blur-[90px]" />
        <div className="relative z-[1] mx-auto max-w-[960px]">
          <h1 className="font-display text-[clamp(36px,5vw,56px)] font-bold leading-[1.1] tracking-[-0.04em]">Jadwal <span className="text-brand-2">saya</span></h1>
          <p className="mt-3 max-w-[560px] text-base leading-relaxed text-muted">Jadwal main yang sudah terkonfirmasi dan pesanan yang masih menunggu pembayaran.</p>

          <Bagian judul="Terkonfirmasi" jumlah={terkonfirmasi.length}
            kosong={<>Belum ada jadwal terkonfirmasi. <Link href="/#lapangan" className="font-bold text-brand underline">Pilih lapangan</Link></>}>
            {terkonfirmasi.map((p) => <JadwalKartu key={p.kode} p={p} now={now} />)}
          </Bagian>

          <Bagian judul="Menunggu pembayaran" jumlah={menunggu.length} kosong="Tidak ada pesanan yang menunggu pembayaran.">
            {menunggu.map((p) => <JadwalKartu key={p.kode} p={p} now={now} />)}
          </Bagian>
        </div>
      </main>
    </div>
  );
}
