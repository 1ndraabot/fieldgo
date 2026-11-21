'use client';

import { useState, type FormEvent } from 'react';
import { Banner, Field, TeksInput } from '@/components/auth/ui';
import type { PengaturanData } from '@/lib/demo-fe';

const BANK = ['Bank BCA', 'Bank Mandiri', 'BNI', 'BRI', 'Bank Permata'] as const;

/** Form pengaturan global (FR-ADM-11): rekening tujuan bayar, batas bayar, batas pembatalan. FE dulu: simpan lokal saja. */
export default function PengaturanForm({ data }: { data: PengaturanData }) {
  const [bank, setBank] = useState(data.bank);
  const [nomor, setNomor] = useState(data.nomorRekening);
  const [atasNama, setAtasNama] = useState(data.atasNama);
  const [bayarJam, setBayarJam] = useState(String(data.batasBayarJam));
  const [batalHari, setBatalHari] = useState(String(data.batasPembatalanHari));
  const [galat, setGalat] = useState('');
  const [kirim, setKirim] = useState(false);
  const [sukses, setSukses] = useState(false);

  function simpan(e: FormEvent) {
    e.preventDefault();
    const jam = Number(bayarJam), hari = Number(batalHari);
    if (!nomor.trim()) { setGalat('Nomor rekening wajib diisi.'); return; }
    if (!atasNama.trim()) { setGalat('Nama pemilik rekening wajib diisi.'); return; }
    if (!Number.isFinite(jam) || jam < 1 || jam > 72) { setGalat('Batas bayar antara 1–72 jam.'); return; }
    if (!Number.isFinite(hari) || hari < 1 || hari > 7) { setGalat('Batas pembatalan antara 1–7 hari.'); return; }
    setGalat('');
    setKirim(true);
    // FE dulu: POST /api/admin/pengaturan menyusul; perubahan memengaruhi pesanan baru saja (BR-06).
    setTimeout(() => { setKirim(false); setSukses(true); }, 600);
  }

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-5">
      {sukses && <Banner nada="teal" ikon="check" role="status">Pengaturan tersimpan (mode tampilan). Berlaku untuk pesanan baru; pesanan lama tidak berubah (BR-06).</Banner>}
      {galat && <Banner nada="amber" ikon="alert">{galat}</Banner>}

      <fieldset className="flex flex-col gap-4 rounded-[22px] border-[1.5px] border-line p-5">
        <legend className="px-1.5 text-sm font-bold">Rekening tujuan pembayaran</legend>
        <Field id="bank" label="Nama bank">
          <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
            {BANK.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field id="nomor" label="Nomor rekening">
          <TeksInput id="nomor" value={nomor} onChange={(v) => { setNomor(v); setGalat(''); }}
            autoComplete="off" placeholder="Contoh: 1234 567 890" />
        </Field>
        <Field id="atasNama" label="Atas nama">
          <TeksInput id="atasNama" value={atasNama} onChange={(v) => { setAtasNama(v); setGalat(''); }}
            autoComplete="organization" placeholder="Nama pemilik rekening" />
        </Field>
        <p className="text-[13px] text-muted">Rekening ini tampil pada halaman pembayaran penyewa (FR-PAY-01) beserta total yang terkunci.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-[22px] border-[1.5px] border-line p-5">
        <legend className="px-1.5 text-sm font-bold">Batas waktu</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bayarJam" label="Batas unggah bukti (jam)">
            <TeksInput id="bayarJam" value={bayarJam} onChange={(v) => { setBayarJam(v.replace(/[^\d]/g, '')); setGalat(''); }}
              autoComplete="off" type="number" placeholder="24" />
          </Field>
          <Field id="batalHari" label="Batas pengajuan batal (hari sebelum main)">
            <TeksInput id="batalHari" value={batalHari} onChange={(v) => { setBatalHari(v.replace(/[^\d]/g, '')); setGalat(''); }}
              autoComplete="off" type="number" placeholder="1" />
          </Field>
        </div>
        <p className="text-[13px] text-muted">
          Batas bayar dihitung dari pesanan dibuat (BR-07). Batas pembatalan dipakai untuk aturan H-1 (BR-12); di luar batas,
          pengajuan diblokir dengan pesan jelas (FR-CAN-01).
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={kirim}
          className="btn h-12 cursor-pointer rounded-full bg-brand px-7 text-sm font-bold text-white disabled:opacity-60">
          {kirim ? 'Menyimpan…' : 'Simpan pengaturan'}
        </button>
        <button type="button" onClick={() => { setBank(data.bank); setNomor(data.nomorRekening); setAtasNama(data.atasNama); setBayarJam(String(data.batasBayarJam)); setBatalHari(String(data.batasPembatalanHari)); setSukses(false); setGalat(''); }}
          className="btn h-12 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-6 text-sm font-bold">
          Kembalikan nilai awal
        </button>
      </div>
    </form>
  );
}
