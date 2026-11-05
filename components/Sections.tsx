import Link from 'next/link';
import type { BerandaData } from '@/lib/beranda';
import { formatJam, formatRupiah, labelPanjang } from '@/lib/format';
import { CourtSurface, PALET } from './Court';
import { Icon, type IconName } from './icons';
import { STATUS } from './status';

const pad = 'px-[clamp(16px,4.5vw,64px)]';
const h2 = 'font-display font-bold tracking-[-0.035em]';
const cta = 'btn flex h-14 items-center gap-3 rounded-full py-0 pl-7 pr-2.5 text-base font-bold no-underline';

export function DarkPanel({ data }: { data: BerandaData }) {
  return (
    <section className="relative z-[1] mx-[clamp(8px,2.2vw,32px)] overflow-hidden rounded-[64px] bg-ink px-[clamp(20px,5vw,72px)] pb-[88px] pt-[340px]">
      <div aria-hidden="true" className="absolute right-[-60px] top-[-140px] size-[520px] rounded-full bg-brand-3 opacity-30 blur-[110px]" />
      <div aria-hidden="true" className="absolute bottom-[-60px] left-[-180px] size-[560px] rounded-full bg-lime opacity-30 blur-[110px]" />
      <div className="relative flex flex-wrap justify-between gap-x-8 gap-y-5">
        {data.olahragaList.map((o) => (
          <span key={o} className="flex items-center gap-2.5 font-display text-[22px] font-semibold text-white/80"><Icon name="ball" size={26} stroke="#C6F432" width={2} />{o}</span>
        ))}
      </div>
      <div className="relative mt-[72px] flex flex-wrap items-center gap-14">
        <div className="relative aspect-[7/5] max-w-[560px] flex-[1_1_380px]">
          <CourtSurface jenis="futsal" base="#22C06B" line="#FFFFFF" label="Ilustrasi lapangan futsal" className="absolute inset-0 overflow-hidden rounded-[40px]" />
          <div className="absolute bottom-6 left-6 flex items-center gap-2.5 rounded-full bg-ink/90 py-2 pl-2 pr-5">
            <span className="flex size-9 items-center justify-center rounded-full bg-lime"><Icon name="check" size={18} stroke="#0B2B1E" width={3} /></span>
            <span className="text-sm font-bold text-white">{data.slotKosongHariIni} slot kosong hari ini</span>
          </div>
          <div aria-hidden="true" className="absolute right-[-18px] top-[-28px] flex size-28 items-center justify-center rounded-[36px] bg-white shadow-[0_16px_32px_rgba(0,0,0,.25)]"><Icon name="spark" size={56} stroke="#16A05A" width={2.6} /></div>
        </div>
        <div className="max-w-[620px] flex-[1_1_380px]">
          <h2 className="font-display text-[clamp(32px,3.6vw,48px)] font-bold leading-[1.18] tracking-[-0.03em] text-white"><span className="text-lime">#1</span> Booking Lapangan<br />Paling Praktis di Kotamu</h2>
          <p className="mt-[22px] max-w-[520px] text-[17px] leading-[1.65] text-white/80">Gelanggang menghubungkan pemain dengan lapangan terbaik. Lihat slot real-time, pesan, bayar lewat transfer, dan admin memverifikasi buktinya. Jam kamu aman.</p>
          <div className="mt-[30px] flex flex-wrap gap-3.5">
            <Link href="#kalender" className={`${cta} bg-lime text-ink`}>Lihat slot kosong<span className="flex size-9 items-center justify-center rounded-full bg-ink"><Icon name="arrow" size={18} stroke="#C6F432" width={2.4} /></span></Link>
            <Link href="#cara" className="btn flex h-14 items-center rounded-full border-[1.5px] border-white/45 px-7 text-base font-bold text-white no-underline">Cara memesan</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Stats({ data }: { data: BerandaData }) {
  const items = [
    [String(data.stats.lapangan), 'Lapangan aktif'],
    [String(data.stats.cabang), 'Cabang olahraga'],
    [data.stats.jamTerpesan30Hari.toLocaleString('id-ID'), 'Jam main terpesan dalam 30 hari terakhir'],
  ];
  return (
    <section aria-label="Angka Gelanggang" className="relative z-0 -mt-[100px] bg-mist px-6 pb-[100px] pt-[196px]">
      <div className="flex flex-wrap justify-center gap-y-12">
        {items.map(([angka, label]) => (
          <div key={label} className="stat flex-[0_1_440px] px-6 text-center">
            <div className="font-display text-[clamp(64px,8vw,104px)] font-bold leading-[1.05] tracking-[-0.05em]">{angka}</div>
            <p className="mx-auto mt-1.5 max-w-[280px] text-base font-medium text-muted">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LapanganSection({ data }: { data: BerandaData }) {
  const href = (o: string | null) => {
    const q = new URLSearchParams();
    if (o) q.set('olahraga', o);
    if (data.tanggal !== data.hariIni) q.set('tanggal', data.tanggal);
    const s = q.toString();
    return `/${s ? '?' + s : ''}#lapangan`;
  };
  return (
    <section id="lapangan" className={`${pad} bg-white py-[130px] text-center`}>
      <span className="inline-flex items-center gap-2.5 rounded-full bg-mint py-[7px] pl-2 pr-[18px] text-sm font-bold text-[#0A6B3A]">
        <span className="flex size-[26px] items-center justify-center rounded-full bg-brand"><Icon name="ball" size={14} stroke="#fff" width={2.6} /></span>
        {data.stats.lapangan} lapangan · {data.stats.cabang} cabang olahraga
      </span>
      <h2 className={`${h2} mx-auto mt-[22px] max-w-[900px] text-[clamp(36px,4.4vw,60px)] leading-[1.13]`}>Pilih Lapangan<br /><span className="text-brand-2">Sesuai Gayamu</span></h2>
      <nav aria-label="Filter jenis olahraga" className="mt-10 flex flex-wrap justify-center gap-3">
        {[null, ...data.olahragaList].map((o) => {
          const aktif = o === data.olahraga;
          return (
            <Link key={o ?? 'semua'} href={href(o)} aria-current={aktif ? 'true' : undefined}
              className={`flex h-12 items-center rounded-full border-[1.5px] px-[26px] text-[15px] font-bold no-underline ${aktif ? 'border-ink bg-ink text-white' : 'border-line bg-mist text-ink'}`}>
              {o ?? 'Semua'}
            </Link>
          );
        })}
      </nav>
      {data.kartu.length === 0 ? (
        <p className="mt-14 text-muted">Belum ada lapangan untuk filter ini. <Link href={href(null)} className="font-bold text-brand underline">Tampilkan semua</Link></p>
      ) : (
        <div className="mx-auto mt-14 grid max-w-[1312px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-x-8 gap-y-14 text-left">
          {data.kartu.map((k) => {
            const p = PALET[k.urutan % PALET.length];
            return (
              <article key={k.id} className="card flex flex-col gap-5">
                <Link href={`/lapangan/${k.id}`} aria-label={`Lihat detail ${k.nama}`} className="relative block aspect-[416/300] no-underline">
                  <CourtSurface jenis={k.ilustrasi} base={p.base} line={p.line} terang={p.terang} className="card-img absolute inset-0 overflow-hidden rounded-[36px]">
                    {k.fotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={k.fotoUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                    )}
                  </CourtSurface>
                  <span className="absolute left-5 top-5 rounded-full bg-white px-4 py-[9px] text-[13px] font-bold">{k.olahraga}</span>
                  <span aria-hidden="true" className="absolute bottom-[18px] right-[18px] flex size-[60px] items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(8,44,28,.2)]"><Icon name="arrow" size={24} stroke="#0B2B1E" width={2.4} /></span>
                </Link>
                <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]">{k.nama}</h3>
                <div className="-mt-2 flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-display text-[19px] font-bold text-brand">{k.hargaMulai === null ? '–' : formatRupiah(k.hargaMulai)}</span>{' '}
                    <span className="text-sm font-medium text-muted">/ jam{k.hargaMulai === null ? '' : ' (mulai dari)'}</span>
                  </span>
                  {k.deskripsi && <span className="truncate text-sm font-medium text-muted">{k.deskripsi}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const FITUR: [IconName, string][] = [
  ['shield', 'Satu slot, satu pesanan. Tidak ada pemesanan ganda.'],
  ['card', 'Bayar dengan transfer, batas 24 jam atau sebelum jam main.'],
  ['cancel', 'Batal sebelum bayar langsung bisa, tanpa form.'],
];

export function KalenderSection({ data }: { data: BerandaData }) {
  return (
    <section id="kalender" className={`${pad} bg-mist py-[110px]`}>
      <div className="mx-auto flex max-w-[1312px] flex-wrap items-center gap-16">
        <div className="flex-[1_1_420px]">
          <h2 className={`${h2} text-[clamp(34px,3.8vw,52px)] leading-[1.15]`}>Slot jelas,<br /><span className="text-brand-2">bayar tenang.</span></h2>
          <p className="mb-8 mt-5 max-w-[480px] text-[17px] leading-[1.65] text-muted">Dari cek jadwal sampai verifikasi bukti, semuanya terlihat jelas di satu tempat. Tidak ada tebak-tebakan jam kosong.</p>
          <ul className="m-0 list-none border-b border-line p-0">
            {FITUR.map(([ikon, teks]) => (
              <li key={teks} className="flex items-center gap-4 border-t border-line py-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint"><Icon name={ikon} size={22} stroke="#0E8A4A" /></span>
                <span className="text-[17px] font-bold">{teks}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="stripe-dark relative box-border flex min-h-[520px] max-w-[640px] flex-[1_1_460px] items-center justify-center overflow-hidden rounded-[48px] bg-forest p-7">
          <div aria-hidden="true" className="absolute right-[-80px] top-[-80px] size-[300px] rounded-full bg-lime opacity-35 blur-[80px]" />
          <div className="relative box-border w-full max-w-[520px] rounded-[28px] bg-white p-6 shadow-[0_24px_48px_rgba(0,0,0,.3)]">
            {data.unggulan ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[17px] font-bold">{data.unggulan.nama}</span>
                  <span className="text-[13px] font-medium text-muted">{labelPanjang(data.tanggal)}</span>
                </div>
                <div className="mt-4 grid grid-cols-6 gap-1.5">
                  {data.unggulan.slot.map((s) => (
                    <span key={s.jam} aria-label={`${formatJam(s.jam)}, ${STATUS[s.status].label}`}
                      className="flex h-11 items-center justify-center rounded-xl text-xs font-bold" style={{ background: STATUS[s.status].bg, color: STATUS[s.status].fg }}>{formatJam(s.jam)}</span>
                  ))}
                </div>
                <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-xs font-medium text-muted">
                  {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => (
                    <li key={k} className="flex items-center gap-1.5"><span className="size-3 rounded border border-black/10" style={{ background: STATUS[k].bg }} />{STATUS[k].label}</li>
                  ))}
                </ul>
              </>
            ) : <p className="text-muted">Belum ada lapangan aktif untuk ditampilkan.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

const LANGKAH = [
  { n: '01', judul: 'Satu slot, satu pesanan.', teks: 'Slot yang dipegang pesanan lain tidak bisa dipilih. Tidak ada pemesanan ganda.', kartu: 'border-[1.5px] border-line bg-white', angka: 'text-brand-2', isi: 'text-muted' },
  { n: '02', judul: 'Bayar dengan transfer.', teks: 'Batas bayar 24 jam atau sebelum jam main. Hitungan berhenti saat bukti diunggah.', kartu: 'bg-brand text-white', angka: 'text-lime', isi: 'text-white/90' },
  { n: '03', judul: 'Batal sebelum bayar.', teks: 'Pesanan yang belum dibayar bisa dibatalkan langsung, tanpa form.', kartu: 'bg-ink text-white', angka: 'text-lime', isi: 'text-white/80' },
];

export function CaraMemesan() {
  return (
    <section id="cara" className={`${pad} bg-white py-[120px]`}>
      <div className="mx-auto max-w-[1312px]">
        <h2 className={`${h2} mb-12 text-center text-[clamp(34px,4vw,52px)] leading-[1.15]`}>Tiga langkah,<br /><span className="text-brand-2">langsung main.</span></h2>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 p-0">
          {LANGKAH.map((l) => (
            <li key={l.n} className={`box-border flex min-h-[280px] flex-col justify-between gap-7 rounded-[36px] p-9 ${l.kartu}`}>
              <span className={`font-display text-[56px] font-extrabold tracking-[-0.04em] ${l.angka}`}>{l.n}</span>
              <div><h3 className="mb-2.5 font-display text-2xl font-bold tracking-[-0.02em]">{l.judul}</h3><p className={`m-0 text-base leading-relaxed ${l.isi}`}>{l.teks}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className={`${pad} relative overflow-hidden bg-mist py-[120px] text-center`}>
      <div aria-hidden="true" className="absolute left-[8%] top-[-60px] size-[360px] rounded-full bg-[#E6F9A6] opacity-80 blur-[90px]" />
      <div aria-hidden="true" className="absolute bottom-[-100px] right-[6%] size-[400px] rounded-full bg-[#A7F0E0] opacity-50 blur-[90px]" />
      <h2 className={`${h2} relative mx-auto max-w-[860px] text-[clamp(36px,4.8vw,64px)] leading-[1.12]`}>Siap main hari ini?<br /><span className="text-brand-2">Amankan jam kamu.</span></h2>
      <div className="relative mt-9 flex flex-wrap justify-center gap-3.5">
        <Link href="#lapangan" className={`${cta} bg-brand text-white`}>Pesan lapangan<span className="flex size-9 items-center justify-center rounded-full bg-lime"><Icon name="arrow" size={18} stroke="#0B2B1E" width={2.4} /></span></Link>
        <Link href="/jadwal-saya" className="btn flex h-14 items-center rounded-full border-[1.5px] border-ink px-7 text-base font-bold no-underline">Lihat jadwal saya</Link>
      </div>
    </section>
  );
}
