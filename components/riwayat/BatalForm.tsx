'use client';

import { useState, type FormEvent } from 'react';
import { Banner, Field, TeksInput, TombolUtama } from '@/components/auth/ui';
import { formatRupiah } from '@/lib/format';

const BANK = ['BCA', 'Mandiri', 'BNI', 'BRI', 'Permata'] as const;

/** Form pengajuan pembatalan (FR-CAN-02). FE dulu: pengiriman ke API pembatalan menyusul (status → Pengajuan pembatalan). */
export function BatalForm({ kode, lapanganNama, jadwalLabel, total, nama, kontak }: {
  kode: string; lapanganNama: string; jadwalLabel: string; total: number; nama: string; kontak: string;
}) {
  const [alasan, setAlasan] = useState('');
  const [bank, setBank] = useState<string>('BCA');
  const [rekening, setRekening] = useState('');
  const [atasNama, setAtasNama] = useState('');
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);

  function ajukan(e: FormEvent) {
    e.preventDefault();
    const g: Record<string, string> = {};
    if (alasan.trim().length < 10) g.alasan = 'Tuliskan alasan minimal 10 karakter agar admin dapat menilai.';
    if (!rekening.trim()) g.rekening = 'Nomor rekening wajib diisi untuk pengembalian dana.';
    if (!atasNama.trim()) g.atasNama = 'Nama pemilik rekening wajib diisi.';
    setGalat(g);
    if (Object.keys(g).length > 0) return;
    setKirim(true);
    // FE dulu: POST /api/pesanan/{kode}/batal-ajuan menyusul; slot tetap terisi sampai keputusan admin (FR-CAN-03).
    setTimeout(() => { setKirim(false); setSukses(true); }, 600);
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-5">
        <Banner nada="teal" ikon="check" role="status">
          Pengajuan pembatalan untuk <strong>{kode}</strong> terkirim. Status pesanan menjadi <strong>Pengajuan pembatalan</strong>; slot tetap terisi sampai admin memutuskan (FR-CAN-03).
        </Banner>
        <p className="text-[13px] font-medium text-muted">Tampilan frontend — pengiriman ke backend menyusul. Keputusan dan nominal refund diputuskan admin (BR-13).</p>
      </div>
    );
  }

  return (
    <form onSubmit={ajukan} noValidate className="flex flex-col gap-5">
      <div className="rounded-[22px] border-[1.5px] border-line bg-mist px-5 py-4">
        <div className="text-[13px] font-bold uppercase tracking-wider text-muted">Pesanan yang diajukan</div>
        <div className="mt-1.5 font-display text-lg font-bold">{kode} · {lapanganNama}</div>
        <div className="text-[15px] text-muted">{jadwalLabel} · {formatRupiah(total)}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><span className="text-sm font-bold">Nama pemesan</span><p className="mt-1 text-[15px] text-muted">{nama}</p></div>
        <div><span className="text-sm font-bold">Nomor kontak</span><p className="mt-1 text-[15px] text-muted">{kontak}</p></div>
      </div>

      <Field id="alasan" label="Alasan pembatalan" galat={galat.alasan}>
        <textarea id="alasan" rows={3} value={alasan} onChange={(e) => { setAlasan(e.target.value); setGalat({}); }}
          aria-invalid={galat.alasan ? true : undefined} aria-describedby={galat.alasan ? 'alasan-galat' : undefined}
          className={`w-full rounded-[18px] border-[1.5px] px-[18px] py-3.5 text-base font-medium focus:border-brand focus:shadow-[0_0_0_4px_rgba(34,192,107,.2)] focus:outline-none ${galat.alasan ? 'border-[#B42328] bg-[#FFFAFA]' : 'border-line bg-white'}`}
          placeholder="Contoh: turnamen dibatalkan karena cuaca" />
      </Field>

      <fieldset className="flex flex-col gap-4 rounded-[22px] border-[1.5px] border-line p-5">
        <legend className="px-1.5 text-sm font-bold">Rekening pengembalian dana</legend>
        <Field id="bank" label="Nama bank">
          <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
            {BANK.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field id="rekening" label="Nomor rekening" galat={galat.rekening}>
          <TeksInput id="rekening" value={rekening} onChange={(v) => { setRekening(v); setGalat({}); }}
            autoComplete="off" placeholder="Contoh: 1234 567 890" galat={galat.rekening} />
        </Field>
        <Field id="atasNama" label="Atas nama" galat={galat.atasNama}>
          <TeksInput id="atasNama" value={atasNama} onChange={(v) => { setAtasNama(v); setGalat({}); }}
            autoComplete="name" placeholder="Nama pemilik rekening" galat={galat.atasNama} />
        </Field>
        <p className="text-[13px] text-muted">Kebijakan refund belum baku: nominal diputuskan dan dicatat admin (BR-13).</p>
      </fieldset>

      <TombolUtama disabled={kirim}>{kirim ? 'Mengirim…' : 'Kirim pengajuan pembatalan'}</TombolUtama>
    </form>
  );
}
