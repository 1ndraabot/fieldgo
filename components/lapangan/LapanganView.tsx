import Link from 'next/link';
import type { LapanganDetail } from '@/lib/demo-fe';
import { formatJam, formatRupiah, labelPanjang, labelPendek } from '@/lib/format';
import type { SlotInfo } from '@/lib/slots';
import { CourtSurface, PALET } from '@/components/Court';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Icon } from '@/components/icons';
import { STATUS } from '@/components/status';
import { SlotPicker } from '@/components/SlotPicker';
import { SITE } from '@/lib/site';

const pad = 'px-[clamp(16px,4.5vw,64px)]';
const HARI_NAMA = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/** Detail lapangan: galeri, deskripsi, fasilitas, lokasi, jam operasional, tarif, kalender slot (FR-PUB-03, FR-PUB-04). */
export function LapanganView({ data, slot, tanggal, hariIni, hrefSebelum, hrefSesud }: {
  data: LapanganDetail; slot: SlotInfo[]; tanggal: string; hariIni: string; hrefSebelum: string | null; hrefSesud: string | null;
}) {
  const p = PALET[(data.id - 1) % PALET.length];
  const kosong = slot.filter((s) => s.status === 'tersedia').length;
  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header aktif="Lapangan" />
      <main>
        {/* Kepala halaman */}
        <section className={`relative ${pad} pb-10 pt-12 text-center`}>
          <div aria-hidden="true" className="absolute right-[-100px] top-[-80px] z-0 size-[420px] rounded-full bg-mint opacity-80 blur-[90px]" />
          <div aria-hidden="true" className="absolute left-[-140px] top-[180px] z-0 size-[360px] rounded-full bg-[#A7F0E0] opacity-50 blur-[90px]" />
          <div className="relative z-[1]">
            <Link href="/#lapangan" className="inline-flex items-center gap-2 text-[15px] font-bold text-muted no-underline">
              Kembali ke daftar lapangan
            </Link>
            <h1 className="mx-auto mt-4 max-w-[820px] font-display text-[clamp(38px,5.4vw,64px)] font-bold leading-[1.08] tracking-[-0.04em]">
              {data.nama}<br /><span className="text-brand-2">{data.olahraga}</span>
            </h1>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-sm font-bold text-[#0A6B3A]">
                <Icon name="pin" size={15} stroke="#0A6B3A" width={2.4} />{data.kapasitas}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-sm font-bold text-[#0A6B3A]">
                <Icon name="shield" size={15} stroke="#0A6B3A" width={2.4} />Rating {data.rating}/5
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-sm font-bold text-[#0A6B3A]">
                <Icon name="clock" size={15} stroke="#0A6B3A" width={2.4} />{kosong} slot kosong · {labelPendek(tanggal)}
              </span>
            </div>
          </div>
        </section>

        {/* Galeri (ilustrasi pengganti foto sampai unggah foto aktif) */}
        <section aria-label="Galeri lapangan" className={`grid ${pad} gap-4 pb-16 max-[980px]:grid-cols-1 md:grid-cols-3`} style={{ gridTemplateColumns: undefined }}>
          <div className="md:col-span-2">
            <CourtSurface jenis={data.ilustrasi} base={p.base} line={p.line} terang={p.terang} label={`Ilustrasi lapangan ${data.olahraga}`}
              className="aspect-[16/9] overflow-hidden rounded-[36px]" />
          </div>
          <div className="flex flex-col gap-4">
            {PALET.slice(0, 2).map((q, i) => (
              <CourtSurface key={q.base} jenis={data.ilustrasi} base={q.base} line={q.line} terang={q.terang}
                label={`Sudut ${i + 1} lapangan ${data.olahraga}`} className="min-h-[120px] flex-1 overflow-hidden rounded-[28px]" />
            ))}
          </div>
        </section>

        {/* Deskripsi, fasilitas, lokasi */}
        <section className={`grid ${pad} gap-10 pb-20 lg:grid-cols-[1.2fr_1fr]`}>
          <div>
            <h2 className="font-display text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.03em]">Tentang lapangan</h2>
            <p className="mt-4 max-w-[640px] text-[17px] leading-[1.7] text-muted">{data.deskripsi}</p>
            <h3 className="mt-9 font-display text-xl font-bold tracking-[-0.02em]">Fasilitas</h3>
            <ul className="mt-4 flex max-w-[640px] flex-wrap gap-2.5">
              {data.fasilitas.map((f) => (
                <li key={f} className="flex items-center gap-2 rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-sm font-semibold">
                  <Icon name="check" size={14} stroke="#0E8A4A" width={3} />{f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5">
            <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
              <div className="flex items-center gap-2.5 font-display text-lg font-bold"><Icon name="pin" size={20} stroke="#0E8A4A" width={2.4} />Lokasi</div>
              <p className="mt-3 text-[15px] leading-relaxed">{data.alamat}</p>
              <p className="mt-1 text-sm text-muted">Koordinat: {data.koordinat}</p>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(data.alamat)}`} target="_blank" rel="noreferrer"
                className="btn mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-white no-underline">
                Buka peta <Icon name="arrow" size={15} stroke="#C6F432" width={2.4} />
              </a>
            </div>
            <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
              <div className="flex items-center gap-2.5 font-display text-lg font-bold"><Icon name="clock" size={20} stroke="#0E8A4A" width={2.4} />Jam operasional</div>
              <table className="mt-3 w-full text-left text-[15px]">
                <tbody>
                  {data.jamOperasional.map((o) => (
                    <tr key={o.hari} className="border-t border-line first:border-t-0">
                      <td className="py-2 pr-3 font-semibold">{HARI_NAMA[o.hari - 1]}</td>
                      <td className="py-2 text-right text-muted">{o.buka ? `${formatJam(o.jamBuka)}–${formatJam(o.jamTutup)}` : 'Tutup'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Tabel harga */}
        <section className={`${pad} pb-20`}>
          <div className="mx-auto max-w-[960px] rounded-[32px] border-[1.5px] border-line bg-white p-7">
            <h2 className="font-display text-[clamp(24px,2.8vw,32px)] font-bold tracking-[-0.03em]">Harga per jam</h2>
            <table className="mt-5 w-full text-left text-[15px]">
              <thead>
                <tr className="text-[13px] uppercase tracking-wider text-muted">
                  <th className="pb-3 font-bold">Tipe hari</th>
                  <th className="pb-3 font-bold">Rentang jam</th>
                  <th className="pb-3 text-right font-bold">Harga / jam</th>
                </tr>
              </thead>
              <tbody>
                {data.tarif.map((t, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-3.5 font-semibold">{t.tipeHari === 'weekday' ? 'Hari kerja' : 'Akhir pekan'}</td>
                    <td className="py-3.5 text-muted">{formatJam(t.jamMulai)}–{formatJam(t.jamSelesai)}</td>
                    <td className="py-3.5 text-right font-display text-[17px] font-bold text-brand">{formatRupiah(t.hargaPerJam)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-sm text-muted">Harga dikunci saat pesanan dibuat; perubahan tarif kemudian tidak memengaruhi pesanan lama (BR-06).</p>
          </div>
        </section>

        {/* Kalender slot */}
        <section id="kalender" className={`${pad} bg-mist py-20`}>
          <div className="mx-auto max-w-[1312px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.12] tracking-[-0.03em]">Kalender ketersediaan<br /><span className="text-brand-2">{labelPanjang(tanggal)}</span></h2>
                <p className="mt-3 max-w-[520px] text-[17px] text-muted">Status dihitung langsung dari data pesanan saat halaman dibuka — bukan disimpan.</p>
              </div>
              <nav aria-label="Pindah tanggal" className="flex items-center gap-2.5">
                {hrefSebelum ? (
                  <Link href={hrefSebelum} aria-label="Hari sebelumnya" className="btn flex size-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-white no-underline"><Icon name="arrow" size={20} stroke="#0B2B1E" width={2.4} /></Link>
                ) : (
                  <span aria-disabled="true" className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-line bg-white opacity-40"><Icon name="arrow" size={20} stroke="#4F6358" width={2.4} /></span>
                )}
                <Link href={`/lapangan/${data.id}`} aria-label="Hari ini" className={`btn flex h-12 items-center rounded-full border-[1.5px] px-5 text-[15px] font-bold no-underline ${tanggal === hariIni ? 'border-line bg-white text-muted' : 'border-ink bg-ink text-white'}`}>Hari ini</Link>
                {hrefSesud ? (
                  <Link href={hrefSesud} aria-label="Hari berikutnya" className="btn flex size-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-white no-underline"><Icon name="kanan" size={20} stroke="#0B2B1E" width={2.4} /></Link>
                ) : (
                  <span aria-disabled="true" className="flex size-12 items-center justify-center rounded-full border-[1.5px] border-line bg-white opacity-40"><Icon name="kanan" size={20} stroke="#4F6358" width={2.4} /></span>
                )}
              </nav>
            </div>

            <div className="mt-10 flex flex-wrap items-start gap-10">
              <div className="min-w-[560px] max-w-[720px] flex-[1_1_560px]">
                <div className="grid grid-cols-6 gap-2">
                  {slot.map((s) => {
                    const st = STATUS[s.status];
                    return (
                      <span key={s.jam} aria-label={`${formatJam(s.jam)}, ${st.label}${s.harga ? `, ${formatRupiah(s.harga)}` : ''}`}
                        className="flex h-12 flex-col items-center justify-center rounded-[14px] text-xs font-bold" style={{ background: st.bg, color: st.fg }}>
                        {formatJam(s.jam)}
                        {s.harga !== null && <span className="text-[10px] font-semibold opacity-80">{Math.round(s.harga / 1000)}rb</span>}
                      </span>
                    );
                  })}
                </div>
                <ul className="m-0 mt-5 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-[13px] font-medium text-muted">
                  {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => (
                    <li key={k} className="flex items-center gap-1.5"><span className="size-3 rounded border border-black/10" style={{ background: STATUS[k].bg }} />{STATUS[k].label}</li>
                  ))}
                </ul>
              </div>
              <SlotPicker lapanganId={data.id} nama={data.nama} tanggal={tanggal} tanggalLabel={labelPendek(tanggal)} slot={slot} />
            </div>
          </div>
        </section>
      </main>
      <Footer olahragaList={[data.olahraga, 'Futsal', 'Badminton']} />
      <p className="sr-only">{SITE.nama}</p>
    </div>
  );
}
