import Link from 'next/link';
import type { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Icon, type IconName } from '@/components/icons';
import { Banner } from '@/components/auth/ui';
import { BuktiForm } from '@/components/pembayaran/BuktiForm';
import { HitungMundur } from '@/components/pembayaran/HitungMundur';
import { SalinRekening } from '@/components/pembayaran/SalinRekening';
import { formatJam, formatRupiah, labelDibuat, labelPanjang } from '@/lib/format';
import { labelBatasBayar } from '@/lib/jadwal';
import type { HalamanBayar } from '@/lib/pembayaran/data';
import { langkahStepper, tampilDari, type Tampil } from '@/lib/pembayaran/tampil';

const JUDUL: Record<Tampil, [string, string]> = {
  bayar: ['Selesaikan', 'pembayaran'], verifikasi: ['Bukti', 'terkirim'], terkonfirmasi: ['Pesanan', 'terkonfirmasi'],
  ditolak: ['Bukti', 'ditolak'], dibatalkan: ['Pesanan', 'dibatalkan'], kedaluwarsa: ['Pesanan', 'kedaluwarsa'],
  selesai: ['Pesanan', 'selesai'], pengajuan: ['Pembatalan', 'diajukan'],
};
const BADGE: Record<Tampil, { teks: string; kelas: string; titik: string }> = {
  bayar: { teks: 'Menunggu pembayaran', kelas: 'bg-[#FFF1D6] text-[#7A4B00]', titik: 'bg-[#F5A524]' },
  verifikasi: { teks: 'Menunggu verifikasi', kelas: 'bg-[#E6FBF7] text-[#0B5E52]', titik: 'bg-[#2DD4BF]' },
  terkonfirmasi: { teks: 'Terkonfirmasi', kelas: 'bg-mint text-[#0A6B3A]', titik: 'bg-brand' },
  ditolak: { teks: 'Ditolak', kelas: 'bg-[#FDE4E5] text-[#7A1519]', titik: 'bg-[#E5484D]' },
  dibatalkan: { teks: 'Dibatalkan', kelas: 'bg-[#E3EAE6] text-[#4F6358]', titik: 'bg-[#8FA398]' },
  kedaluwarsa: { teks: 'Kedaluwarsa', kelas: 'bg-[#E3EAE6] text-[#4F6358]', titik: 'bg-[#8FA398]' },
  selesai: { teks: 'Selesai', kelas: 'bg-[#E3EAE6] text-[#4F6358]', titik: 'bg-[#8FA398]' },
  pengajuan: { teks: 'Pengajuan pembatalan', kelas: 'bg-[#FFF1D6] text-[#7A4B00]', titik: 'bg-[#F5A524]' },
};
const LABEL_LANGKAH = ['Pilih slot', 'Bayar', 'Verifikasi admin'];

function pesanStatus(t: Tampil, alasan: string | null): { ikon: IconName; ikonBg: string; ikonWarna: string; pesan: string; cta: [string, string] } {
  const jadwal: [string, string] = ['Lihat jadwal saya', '/jadwal-saya'];
  const ulang: [string, string] = ['Pesan ulang', '/#lapangan'];
  switch (t) {
    case 'verifikasi': return { ikon: 'clock', ikonBg: '#E6FBF7', ikonWarna: '#0B5E52', pesan: 'Admin sedang memeriksa bukti transfermu. Setelah disetujui, jadwal ini tampil sebagai Terkonfirmasi di Jadwal saya.', cta: jadwal };
    case 'terkonfirmasi': return { ikon: 'check', ikonBg: '#0E8A4A', ikonWarna: '#FFFFFF', pesan: 'Pembayaranmu sudah diverifikasi. Sampai jumpa di lapangan.', cta: jadwal };
    case 'ditolak': return { ikon: 'cancel', ikonBg: '#FDE4E5', ikonWarna: '#B42328', pesan: `Bukti transfer dinyatakan tidak valid dan bersifat final.${alasan ? ` Alasan: ${alasan}.` : ''} Silakan pesan ulang.`, cta: ulang };
    case 'dibatalkan': return { ikon: 'cancel', ikonBg: '#E3EAE6', ikonWarna: '#4F6358', pesan: 'Pesanan ini dibatalkan dan slotnya sudah dilepas.', cta: ulang };
    case 'kedaluwarsa': return { ikon: 'clock', ikonBg: '#E3EAE6', ikonWarna: '#4F6358', pesan: 'Batas bayar terlewati, jadi slot dilepas otomatis. Silakan pesan ulang.', cta: ulang };
    case 'pengajuan': return { ikon: 'clock', ikonBg: '#FFF1D6', ikonWarna: '#7A4B00', pesan: 'Pengajuan pembatalanmu sedang ditinjau admin.', cta: jadwal };
    default: return { ikon: 'check', ikonBg: '#E3EAE6', ikonWarna: '#4F6358', pesan: 'Jadwal main ini sudah selesai.', cta: jadwal };
  }
}

function Baris({ k, v }: { k: string; v: ReactNode }) {
  return <div className="flex justify-between gap-3"><dt className="font-medium text-muted">{k}</dt><dd className="m-0 text-right font-bold">{v}</dd></div>;
}

export function PembayaranView({ pengguna, data, now }: { pengguna: { nama: string }; data: HalamanBayar; now: Date }) {
  const t = tampilDari(data.status, data.batasBayarPada, now);
  const langkah = langkahStepper(t);
  const [kata, hijau] = JUDUL[t];
  const b = BADGE[t];
  const s = t === 'bayar' ? null : pesanStatus(t, data.alasanPenolakan);

  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={pengguna} aktif="Jadwal saya" />
      <main className="relative px-[clamp(16px,4.5vw,64px)] pb-28 pt-8">
        <div aria-hidden="true" className="absolute right-[-100px] top-[-20px] size-[460px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div aria-hidden="true" className="absolute bottom-[80px] left-[-140px] size-[420px] rounded-full bg-[#E6F9A6] opacity-60 blur-[90px]" />
        <div className="relative z-[1] mx-auto max-w-[1312px]">
          {langkah && (
            <ol aria-label="Tahap pemesanan" className="m-0 mb-7 flex list-none flex-wrap gap-2.5 p-0">
              {langkah.map((st, i) => (
                <li key={LABEL_LANGKAH[i]} aria-current={st === 'aktif' ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 text-sm font-bold ${st === 'selesai' ? 'bg-mint text-[#0A6B3A]' : st === 'aktif' ? 'bg-ink text-white' : 'border border-line bg-mist text-muted'}`}>
                  <span className={`flex size-[22px] items-center justify-center rounded-full text-xs ${st === 'selesai' ? 'bg-brand' : st === 'aktif' ? 'bg-lime text-ink' : 'border border-line bg-white'}`}>
                    {st === 'selesai' ? <Icon name="check" size={12} stroke="#fff" width={3.4} /> : i + 1}
                  </span>
                  {LABEL_LANGKAH[i]}
                </li>
              ))}
            </ol>
          )}
          <h1 className="font-display text-[clamp(38px,5vw,64px)] font-bold leading-[1.08] tracking-[-0.04em]">{kata} <span className="text-brand-2">{hijau}</span></h1>

          <div className="mt-10 flex flex-wrap items-start gap-10">
            <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-6">
              {t === 'bayar' ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-5 rounded-[36px] border-[1.5px] border-[#F5A524] bg-[#FFF1D6] px-8 py-7">
                    <div>
                      <div className="text-sm font-bold text-[#7A4B00]">Batas bayar</div>
                      <div className="mt-1 text-lg font-bold">{labelBatasBayar(data.batasBayarPada)}</div>
                    </div>
                    <div className="font-display text-[clamp(40px,6vw,64px)] font-extrabold tracking-[-0.04em]">
                      <HitungMundur target={data.batasBayarPada.toISOString()} />
                    </div>
                  </div>

                  {data.rekening ? (
                    <div className="relative overflow-hidden rounded-[40px] bg-ink p-8 text-white">
                      <div aria-hidden="true" className="absolute right-[-60px] top-[-80px] size-[300px] rounded-full bg-lime opacity-30 blur-[80px]" />
                      <div className="relative flex flex-wrap items-end justify-between gap-6">
                        <div>
                          <div className="text-sm font-semibold text-white/80">Transfer ke</div>
                          <div className="mt-1.5 text-lg font-bold">{data.rekening.bank} · a.n. {data.rekening.nama}</div>
                          <div className="mt-3.5 font-display text-[clamp(30px,4vw,44px)] font-bold tracking-[0.02em] text-lime">{data.rekening.nomor}</div>
                        </div>
                        <SalinRekening nomor={data.rekening.nomor} />
                      </div>
                      <div className="relative mt-6 border-t border-white/15 pt-5">
                        <div className="text-sm font-semibold text-white/80">Total yang harus ditransfer</div>
                        <div className="mt-1.5 font-display text-[clamp(40px,5vw,60px)] font-extrabold tracking-[-0.04em]">{formatRupiah(data.totalHarga)}</div>
                      </div>
                    </div>
                  ) : (
                    <Banner nada="amber" ikon="alert">Rekening tujuan belum diatur. Hubungi pengelola sebelum mentransfer. Total pesanan {formatRupiah(data.totalHarga)}.</Banner>
                  )}

                  <BuktiForm kode={data.kode} />
                </>
              ) : (
                s && (
                  <div className="flex flex-col items-start gap-5 rounded-[36px] border-[1.5px] border-line bg-white p-9 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
                    <span className="flex size-[72px] items-center justify-center rounded-full" style={{ background: s.ikonBg }}><Icon name={s.ikon} size={32} stroke={s.ikonWarna} /></span>
                    <p className="m-0 max-w-[560px] text-lg leading-relaxed text-muted">{s.pesan}</p>
                    <Link href={s.cta[1]} className="btn flex h-14 items-center rounded-full bg-brand px-8 text-base font-bold text-white no-underline">{s.cta[0]}</Link>
                  </div>
                )
              )}
            </div>

            <aside aria-label="Ringkasan pesanan" className="box-border max-w-[464px] flex-[1_1_400px] rounded-[40px] border-[1.5px] border-line bg-white p-[30px] shadow-[0_28px_56px_rgba(8,44,28,.14)] lg:sticky lg:top-6">
              <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13px] font-bold ${b.kelas}`}><span aria-hidden="true" className={`size-2 rounded-full ${b.titik}`} />{b.teks}</span>
              <div className="mt-4 font-display text-[26px] font-bold tracking-[-0.03em]">{data.kode}</div>
              <dl className="m-0 mt-5 grid gap-3.5 text-[15px]">
                <Baris k="Lapangan" v={data.lapanganNama} />
                <Baris k="Tanggal" v={labelPanjang(data.tanggal)} />
                <Baris k="Jam" v={`${formatJam(data.jamMulai)}–${formatJam(data.jamSelesai)} (${data.jamSelesai - data.jamMulai} jam)`} />
                <Baris k="Dibuat" v={labelDibuat(data.dibuatPada)} />
              </dl>
              <div className="mt-[22px] grid gap-3 rounded-3xl bg-mist p-5 text-[15px]">
                {data.slot.map((x) => (
                  <div key={x.jam} className="flex justify-between"><span className="font-medium text-muted">{formatJam(x.jam)}–{formatJam(x.jam + 1)}</span><span className="font-bold">{formatRupiah(x.harga)}</span></div>
                ))}
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <span className="font-bold">Total</span>
                  <span className="font-display text-[22px] font-bold text-brand">{formatRupiah(data.totalHarga)}</span>
                </div>
              </div>
              <p className="m-0 mt-[18px] text-[13px] leading-[1.6] text-muted">Harga dikunci saat pesanan dibuat dan tidak berubah meski tarif diubah.</p>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
