'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Banner, Field, TeksInput } from '@/components/auth/ui';
import { kirimApi } from '@/components/admin/api';
import type { Pengaturan } from '@/lib/admin/pengaturan/data';
import { METODE_PEMBAYARAN } from '@/lib/admin/pengaturan/rules';

const BANK = ['Bank BCA', 'Bank Mandiri', 'BNI', 'BRI', 'Bank Permata', 'Bank Syariah Indonesia'];

/** Form pengaturan global (FR-ADM-11): rekening, batas waktu, sakelar gateway, metode pembayaran. */
export default function PengaturanForm({ data }: { data: Pengaturan }) {
  const router = useRouter();
  const [bank, setBank] = useState(data.rekening?.bank ?? BANK[0]);
  const [nomor, setNomor] = useState(data.rekening?.nomor ?? '');
  const [atasNama, setAtasNama] = useState(data.rekening?.atasNama ?? '');
  const [bayarJam, setBayarJam] = useState(String(data.batasBayarJam));
  const [batalHari, setBatalHari] = useState(String(data.batasPembatalanHari));
  const [gatewayAktif, setGatewayAktif] = useState(data.gatewayAktif);
  const [metode, setMetode] = useState<string[]>(data.metodeAktif);
  const [galat, setGalat] = useState('');
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  function kembalikan() {
    setBank(data.rekening?.bank ?? BANK[0]);
    setNomor(data.rekening?.nomor ?? '');
    setAtasNama(data.rekening?.atasNama ?? '');
    setBayarJam(String(data.batasBayarJam));
    setBatalHari(String(data.batasPembatalanHari));
    setGatewayAktif(data.gatewayAktif);
    setMetode(data.metodeAktif);
    setPesan(null);
    setGalat('');
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    const jam = Number(bayarJam), hari = Number(batalHari);
    if (!nomor.trim() && (bank.trim() || atasNama.trim())) { setGalat('Nomor rekening wajib diisi bila bank/atas nama diisi.'); return; }
    if (!atasNama.trim() && nomor.trim()) { setGalat('Nama pemilik rekening wajib diisi.'); return; }
    if (!Number.isInteger(jam) || jam < 1 || jam > 72) { setGalat('Batas bayar antara 1–72 jam.'); return; }
    if (!Number.isInteger(hari) || hari < 1 || hari > 7) { setGalat('Batas pembatalan antara 1–7 hari.'); return; }
    setGalat('');
    setKirim(true);
    setPesan(null);
    const h = await kirimApi('/api/admin/pengaturan', 'POST', {
      rekening: nomor.trim() ? { bank, nomor, atasNama } : null,
      batasBayarJam: jam,
      batasPembatalanHari: hari,
      gatewayAktif,
      metodeAktif: metode,
    });
    setKirim(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Pengaturan gagal disimpan.' });
      return;
    }
    setPesan({ nada: 'teal', teks: 'Pengaturan tersimpan. Berlaku untuk pesanan baru; pesanan lama tidak berubah.' });
    router.refresh();
  }

  return (
    <form onSubmit={simpan} noValidate className="flex flex-col gap-5">
      {pesan && <Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner>}
      {galat && <Banner nada="amber" ikon="alert">{galat}</Banner>}

      <fieldset className="flex flex-col gap-4 rounded-[22px] border-[1.5px] border-line p-5">
        <legend className="px-1.5 text-sm font-bold">Rekening tujuan pengembalian dana</legend>
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          Dipakai admin sebagai info transfer refund manual. Pembayaran penyewa sepenuhnya lewat payment gateway.
        </p>
        <Field id="bank" label="Nama bank">
          <select id="bank" value={bank} onChange={(e) => setBank(e.target.value)}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
            {!BANK.includes(bank) && <option value={bank}>{bank}</option>}
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
        <p className="m-0 text-[13px] leading-relaxed text-muted">Kosongkan ketiganya bila belum ada rekening refund.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-[22px] border-[1.5px] border-line p-5">
        <legend className="px-1.5 text-sm font-bold">Batas waktu</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="bayarJam" label="Batas bayar (jam)">
            <TeksInput id="bayarJam" value={bayarJam} onChange={(v) => { setBayarJam(v.replace(/[^\d]/g, '')); setGalat(''); }}
              autoComplete="off" type="number" placeholder="1" />
          </Field>
          <Field id="batalHari" label="Batas pengajuan batal (hari sebelum main)">
            <TeksInput id="batalHari" value={batalHari} onChange={(v) => { setBatalHari(v.replace(/[^\d]/g, '')); setGalat(''); }}
              autoComplete="off" type="number" placeholder="1" />
          </Field>
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          Batas bayar dihitung dari pesanan dibuat dan tidak pernah melewati jam mulai main. Batas pembatalan
          menentukan paling lambat H-berapa penyewa boleh mengajukan pembatalan.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-[22px] border-[1.5px] border-line p-5">
        <legend className="px-1.5 text-sm font-bold">Payment gateway</legend>
        <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold">
          <input type="checkbox" checked={gatewayAktif} onChange={(e) => setGatewayAktif(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-[#22C06B]" />
          <span>
            Terima pembayaran online
            <span className="mt-1 block text-[13px] font-medium leading-relaxed text-muted">
              Bila dimatikan, tombol bayar ditutup dan endpoint bayar menolak dengan kode GATEWAY_NONAKTIF. Pesanan yang
              sudah terkonfirmasi tidak terpengaruh.
            </span>
          </span>
        </label>

        <div>
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted">Metode yang diaktifkan</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {METODE_PEMBAYARAN.map((m) => (
              <label key={m.kode} className="flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-line px-3 py-2 text-sm font-semibold">
                <input type="checkbox" className="size-4 accent-[#0E8A4A]" checked={metode.includes(m.kode)}
                  onChange={(e) => setMetode((s) => (e.target.checked ? [...s, m.kode] : s.filter((x) => x !== m.kode)))} />
                {m.label}
              </label>
            ))}
          </div>
          <p className="m-0 mt-2 text-[13px] leading-relaxed text-muted">
            Tidak memilih apa pun berarti semua metode yang aktif di akun gateway dipakai.
          </p>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={kirim}
          className="btn h-12 cursor-pointer rounded-full bg-brand px-7 text-sm font-bold text-white disabled:opacity-60">
          {kirim ? 'Menyimpan…' : 'Simpan pengaturan'}
        </button>
        <button type="button" onClick={kembalikan}
          className="btn h-12 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-6 text-sm font-bold">
          Kembalikan nilai awal
        </button>
      </div>
    </form>
  );
}
