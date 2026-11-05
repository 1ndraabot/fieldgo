import type { BerandaData } from '@/lib/beranda';
import { labelPendek } from '@/lib/format';
import { SITE } from '@/lib/site';
import { CourtSurface } from './Court';
import { Icon, type IconName } from './icons';
import { SlotPicker } from './SlotPicker';

const field = 'flex flex-[1_1_200px] items-center gap-3 px-3.5 py-1';
const ctl = 'bg-transparent text-[15px] font-bold outline-none';

function Field({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <label className={field}>
      <span className="flex size-11 items-center justify-center rounded-full bg-mint"><Icon name={icon} stroke="#0E8A4A" /></span>
      <span className="flex flex-col gap-0.5"><span className="text-xs font-medium text-muted">{label}</span>{children}</span>
    </label>
  );
}

export function Hero({ data }: { data: BerandaData }) {
  const malam = data.unggulan?.slot.filter((s) => s.jam >= 18) ?? [];
  return (
    <section className="relative px-[clamp(16px,4.5vw,64px)] pt-12 text-center">
      <div aria-hidden="true" className="absolute left-[-160px] top-[260px] z-0 size-[520px] rounded-full bg-[#E6F9A6] opacity-80 blur-[90px]" />
      <div aria-hidden="true" className="absolute right-[-120px] top-[-60px] z-0 size-[560px] rounded-full bg-mint opacity-95 blur-[90px]" />
      <div aria-hidden="true" className="absolute right-[-60px] top-[420px] z-0 size-[360px] rounded-full bg-[#A7F0E0] opacity-45 blur-[90px]" />
      <div aria-hidden="true" className="absolute left-[11%] top-[150px] z-[2] flex size-[72px] items-center justify-center rounded-full border border-line bg-white shadow-[0_12px_28px_rgba(8,44,28,.14)] max-[980px]:hidden"><Icon name="ball" size={36} stroke="#16A05A" width={2} /></div>
      <div aria-hidden="true" className="absolute right-[11%] top-9 z-[2] flex size-[92px] items-center justify-center rounded-full bg-lime max-[980px]:hidden"><Icon name="spark" size={44} stroke="#0B2B1E" width={2.6} /></div>

      <h1 className="relative z-[2] mx-auto max-w-[1000px] font-display text-[clamp(40px,6.4vw,80px)] font-bold leading-[1.1] tracking-[-0.035em]">
        Pesan Lapangan,<br /><span className="text-brand-2">Jam demi Jam.</span>
      </h1>
      <p className="relative z-[2] mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-muted">
        Cek slot kosong, pilih jam, lalu unggah bukti transfer. Tanpa chat ke admin, tanpa bentrok jadwal.
      </p>

      <form role="search" aria-label="Cari slot lapangan" action="/#lapangan" method="get"
        className="relative z-[2] mx-auto mt-9 flex max-w-[900px] flex-wrap items-center gap-1.5 rounded-[44px] border-[1.5px] border-line bg-white py-2.5 pl-3 pr-2.5 text-left shadow-[0_20px_44px_rgba(8,44,28,.1)]">
        <Field icon="ball" label="Olahraga">
          <select name="olahraga" defaultValue={data.olahraga ?? ''} className={ctl}>
            <option value="">Semua</option>
            {data.olahragaList.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <div aria-hidden="true" className="h-9 w-px bg-line max-[980px]:hidden" />
        <Field icon="calendar" label="Tanggal">
          <input type="date" name="tanggal" min={data.hariIni} defaultValue={data.tanggal} className={ctl} />
        </Field>
        <button type="submit" className="btn flex h-14 cursor-pointer items-center gap-2.5 rounded-full border-0 bg-brand py-0 pl-7 pr-2.5 text-base font-bold text-white">
          Cari slot
          <span className="flex size-9 items-center justify-center rounded-full bg-white"><Icon name="search" size={18} stroke="#0B2B1E" width={2.4} /></span>
        </button>
      </form>

      {/* panggung: komposisi lapangan yang menimpa panel gelap di bawahnya */}
      <div className="relative z-[3] mx-auto mb-[-240px] mt-14 aspect-[19/10] w-full max-w-[780px]">
        <div aria-hidden="true" className="absolute inset-0 rotate-[5deg] rounded-[40px] bg-lime" />
        <div aria-hidden="true" className="absolute inset-0 rotate-[-5deg] rounded-[40px] bg-mint" />
        <CourtSurface jenis="futsal" base="#22C06B" line="#FFFFFF" label="Ilustrasi lapangan futsal"
          className="absolute inset-0 box-border overflow-hidden rounded-[40px] border-8 border-white shadow-[0_32px_60px_rgba(8,44,28,.3)]" />
        <div className="absolute right-[-20px] top-[-34px] flex size-[104px] flex-col items-center justify-center rounded-full bg-lime shadow-[0_14px_28px_rgba(8,44,28,.18)]">
          <span className="font-display text-[26px] font-extrabold">{data.stats.lapangan}</span>
          <span className="text-xs font-semibold">lapangan aktif</span>
        </div>
        <div className="absolute left-[-90px] top-[36%] flex items-center gap-2 rounded-full border border-line bg-white py-2 pl-2.5 pr-[18px] shadow-[0_14px_30px_rgba(8,44,28,.2)] max-[980px]:hidden">
          <span className="flex size-8 items-center justify-center rounded-full bg-mint"><Icon name="pin" size={16} stroke="#0E8A4A" width={2.4} /></span>
          <span className="text-sm font-bold">{SITE.alamat}</span>
        </div>
        <div className="absolute bottom-[-16px] left-[-40px] flex items-center gap-2 rounded-full bg-ink py-3 pl-4 pr-[18px] shadow-[0_14px_30px_rgba(8,44,28,.3)] max-[980px]:hidden">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-lime" />
          <span className="text-[13px] font-semibold text-white">Slot live · data terbaru saat halaman dibuka</span>
        </div>
        {data.unggulan && (
          <div className="absolute bottom-[-76px] right-[-90px] w-[340px] max-w-[92%]">
            <SlotPicker lapanganId={data.unggulan.id} nama={data.unggulan.nama} tanggal={data.tanggal}
              tanggalLabel={labelPendek(data.tanggal)} slot={malam} />
          </div>
        )}
      </div>
    </section>
  );
}
