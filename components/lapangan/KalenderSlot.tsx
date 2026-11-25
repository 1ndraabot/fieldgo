'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { batasiTanggal, formatJam, formatRupiah, labelPanjang, labelPendek, MAKS_HARI_MUKA, tambahHari } from '@/lib/format';
import type { SlotInfo } from '@/lib/slots';
import { Icon } from '@/components/icons';
import { STATUS } from '@/components/status';
import { SlotPicker } from '@/components/SlotPicker';
import { PemilihKalender } from '@/components/ui/KalenderTema';

const pad = 'px-[clamp(16px,4.5vw,64px)]';

type KeadaanTanggal = {
  tanggal: string; slot: SlotInfo[]; memuat: boolean; gagal: boolean;
  hariIni: string; gantiTanggal: (tanggal: string) => void;
};

const Konteks = createContext<KeadaanTanggal | null>(null);

/**
 * State tanggal + slot di sisi klien. Mengganti tanggal mengambil data lewat
 * /api/lapangan/[id]/slot tanpa reload halaman (R3); URL hanya disinkronkan lewat
 * history.replaceState agar tautan tetap bisa dibagikan. Dipakai bersama oleh
 * chip kepala halaman dan seksi kalender di bawahnya.
 */
export function PenyediaSlotTanggal({ lapanganId, tanggalAwal, slotAwal, hariIni, children }: {
  lapanganId: number; tanggalAwal: string; slotAwal: SlotInfo[]; hariIni: string; children: ReactNode;
}) {
  const [tanggal, setTanggal] = useState(tanggalAwal);
  const [slot, setSlot] = useState(slotAwal);
  const [memuat, setMemuat] = useState(false);
  const [gagal, setGagal] = useState(false);
  const urutan = useRef(0); // nomor permintaan: respons lama (klik cepat) diabaikan

  // Rapikan URL saat pertama dibuka (mis. tanggal tidak valid atau lewat batas 30 hari).
  useEffect(() => {
    const url = tanggalAwal === hariIni ? `/lapangan/${lapanganId}` : `/lapangan/${lapanganId}?tanggal=${tanggalAwal}`;
    window.history.replaceState(null, '', url);
  }, [hariIni, lapanganId, tanggalAwal]);

  const gantiTanggal = useCallback(async (diminta: string) => {
    const t = batasiTanggal(diminta, hariIni, MAKS_HARI_MUKA);
    if (t === tanggal && !gagal) return; // tanggal sama: tidak perlu mengambil ulang
    const no = ++urutan.current;
    const sebelumnya = tanggal;
    setTanggal(t); // tampilkan tanggal baru segera; grid tetap data lama sampai respons tiba
    setMemuat(true);
    setGagal(false);
    try {
      const r = await fetch(`/api/lapangan/${lapanganId}/slot?tanggal=${t}`);
      const j = (await r.json()) as { ok: boolean; tanggal?: string; slot?: SlotInfo[] };
      if (urutan.current !== no) return; // sudah ada pilihan yang lebih baru
      if (r.ok && j.ok && j.slot) {
        const final = j.tanggal ?? t; // server bisa menjepit ke batas 30 hari
        setTanggal(final);
        setSlot(j.slot);
        window.history.replaceState(null, '', final === hariIni ? `/lapangan/${lapanganId}` : `/lapangan/${lapanganId}?tanggal=${final}`);
      } else {
        setTanggal(sebelumnya); // gagal: kembali ke tanggal yang datanya masih tampil
        setGagal(true);
      }
    } catch {
      if (urutan.current === no) {
        setTanggal(sebelumnya);
        setGagal(true);
      }
    } finally {
      if (urutan.current === no) setMemuat(false);
    }
  }, [gagal, hariIni, lapanganId, tanggal]);

  return <Konteks.Provider value={{ tanggal, slot, memuat, gagal, hariIni, gantiTanggal }}>{children}</Konteks.Provider>;
}

function useSlotTanggal(): KeadaanTanggal {
  const k = useContext(Konteks);
  if (!k) throw new Error('useSlotTanggal dipakai di luar PenyediaSlotTanggal');
  return k;
}

/** Chip "N slot kosong · tanggal" di kepala halaman; ikut berubah saat tanggal diganti. */
export function ChipSlotKosong() {
  const { slot, tanggal } = useSlotTanggal();
  const kosong = slot.filter((s) => s.status === 'tersedia').length;
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-mint px-4 py-2 text-sm font-bold text-[#0A6B3A]">
      <Icon name="clock" size={15} stroke="#0A6B3A" width={2.4} />{kosong} slot kosong · {labelPendek(tanggal)}
    </span>
  );
}

/** Seksi "Kalender ketersediaan": navigasi tanggal, grid slot, legenda, dan pemilih jam. */
export function KalenderSlot({ lapanganId, nama }: { lapanganId: number; nama: string }) {
  const { tanggal, slot, memuat, gagal, hariIni, gantiTanggal } = useSlotTanggal();
  const maks = tambahHari(hariIni, MAKS_HARI_MUKA);
  const diAwal = tanggal <= hariIni;
  const diAkhir = tanggal >= maks;
  return (
    <section id="kalender" className={`${pad} bg-mist py-20`}>
      <div className="mx-auto max-w-[1312px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.12] tracking-[-0.03em]">Kalender ketersediaan<br /><span className="text-brand-2">{labelPanjang(tanggal)}</span></h2>
            <p className="mt-3 max-w-[520px] text-[17px] text-muted">Status dihitung langsung dari data pesanan saat tanggal dipilih — bukan disimpan.</p>
          </div>
          <nav aria-label="Pindah tanggal" className="flex items-center gap-2.5">
            <button type="button" onClick={() => gantiTanggal(tambahHari(tanggal, -1))} disabled={diAwal || memuat} aria-label="Hari sebelumnya"
              className="btn flex size-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink bg-white disabled:cursor-not-allowed disabled:border-line disabled:opacity-40">
              <Icon name="arrow" size={20} stroke="#0B2B1E" width={2.4} />
            </button>
            <PemilihKalender nilai={tanggal} ubah={gantiTanggal} min={hariIni} maks={maks} sisi="kanan"
              className={`btn flex h-12 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-5 text-[15px] font-bold ${tanggal === hariIni ? 'border-line bg-white text-muted' : 'border-ink bg-ink text-white'}`}
              isi={<>{tanggal === hariIni ? 'Hari ini' : labelPendek(tanggal)}<Icon name="calendar" size={17} stroke={tanggal === hariIni ? '#0B2B1E' : '#C6F432'} width={2.2} /></>} />
            <button type="button" onClick={() => gantiTanggal(tambahHari(tanggal, 1))} disabled={diAkhir || memuat} aria-label="Hari berikutnya"
              className="btn flex size-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink bg-white disabled:cursor-not-allowed disabled:border-line disabled:opacity-40">
              <Icon name="kanan" size={20} stroke="#0B2B1E" width={2.4} />
            </button>
          </nav>
        </div>

        {gagal && <p role="alert" className="mt-6 text-[15px] font-semibold text-[#B42328]">Gagal memuat slot. Coba pilih tanggal lagi.</p>}

        <div aria-busy={memuat} className={`mt-10 flex flex-wrap items-start gap-10 transition-opacity ${memuat ? 'pointer-events-none opacity-50' : ''}`}>
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
          <SlotPicker key={tanggal} lapanganId={lapanganId} nama={nama} tanggal={tanggal} tanggalLabel={labelPendek(tanggal)} slot={slot} />
        </div>
      </div>
    </section>
  );
}
