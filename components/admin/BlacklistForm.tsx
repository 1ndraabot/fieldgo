'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Banner } from '@/components/auth/ui';
import type { BentrokBlokir } from '@/lib/admin/blacklist/service';
import { formatJam, labelPanjang } from '@/lib/format';
import { kirimApi } from './api';

const LABEL_STATUS: Record<string, string> = {
  menunggu_pembayaran: 'Menunggu pembayaran',
  menunggu_verifikasi: 'Menunggu verifikasi',
  terkonfirmasi: 'Terkonfirmasi',
  pengajuan_pembatalan: 'Pengajuan pembatalan',
};

/** Form tambah blokir (FR-ADM-05) dengan pemeriksaan bentrok di server (AC-15). */
export default function BlacklistForm({ daftarLapangan }: {
  daftarLapangan: { id: number; nama: string }[];
}) {
  const router = useRouter();
  const [lapangan, setLapangan] = useState(daftarLapangan[0]?.id ?? 0);
  const [tanggal, setTanggal] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [seharian, setSeharian] = useState(true);
  const [jamMulai, setJamMulai] = useState(6);
  const [jamSelesai, setJamSelesai] = useState(12);
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState('');
  const [pesan, setPesan] = useState('');
  const [bentrok, setBentrok] = useState<BentrokBlokir[] | null>(null);
  const [sukses, setSukses] = useState(false);
  const [kirim, setKirim] = useState(false);

  const isi = () => ({
    lapanganId: lapangan,
    tanggalMulai: tanggal,
    tanggalSelesai: tanggalSelesai || tanggal,
    seharian,
    jamMulai: seharian ? null : jamMulai,
    jamSelesai: seharian ? null : jamSelesai,
    alasan,
  });

  function bersihkan() {
    setTanggal('');
    setTanggalSelesai('');
    setAlasan('');
    setBentrok(null);
    setSukses(false);
    setPesan('');
    setGalat('');
  }

  async function simpan(abaikanBentrok: boolean) {
    setKirim(true);
    setPesan('');
    const h = await kirimApi('/api/admin/blacklist', 'POST', { ...isi(), abaikanBentrok });
    setKirim(false);
    if (!h.ok) {
      const b = (h.bentrok ?? []) as BentrokBlokir[];
      if (h.kode === 'KONFLIK' && b.length) { setBentrok(b); return; }
      setPesan(h.pesan ?? 'Blokir gagal disimpan.');
      return;
    }
    setBentrok(null);
    setSukses(true);
    router.refresh();
  }

  async function periksa(e: FormEvent) {
    e.preventDefault();
    if (!tanggal) { setGalat('Pilih tanggal mulai blokir.'); return; }
    if (tanggalSelesai && tanggalSelesai < tanggal) { setGalat('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return; }
    if (!seharian && jamSelesai <= jamMulai) { setGalat('Jam selesai harus setelah jam mulai.'); return; }
    if (alasan.trim().length < 5) { setGalat('Tuliskan alasan blokir minimal 5 karakter.'); return; }
    setGalat('');
    setPesan('');
    setKirim(true);
    const h = await kirimApi('/api/admin/blacklist/cek', 'POST', isi());
    setKirim(false);
    if (!h.ok) { setPesan(h.pesan ?? 'Bentrok gagal diperiksa.'); return; }

    const b = (h.bentrok ?? []) as BentrokBlokir[];
    if (b.length) { setBentrok(b); return; }
    await simpan(false);
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-4">
        <Banner nada="teal" ikon="check" role="status">
          Blokir tersimpan. Slot ini menolak pesanan baru dan tampil Terisi pada kalender penyewa.
        </Banner>
        <button type="button" onClick={bersihkan}
          className="btn h-11 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-sm font-bold">
          Tambah blokir lain
        </button>
      </div>
    );
  }

  if (bentrok !== null) {
    return (
      <div className="flex flex-col gap-4">
        <Banner nada="amber" ikon="alert">
          {bentrok.length} pesanan aktif sudah memakai slot ini. Pesanan tersebut <b>tidak akan dibatalkan</b> (BR-14);
          blokir hanya menolak pemesanan baru.
        </Banner>
        <ul className="m-0 flex list-none flex-col gap-2 rounded-[18px] bg-white p-4 text-[13px] font-semibold">
          {bentrok.map((b) => (
            <li key={b.kode}>
              · {b.kode} · {labelPanjang(b.tanggal)} · {formatJam(b.jamMulai)}–{formatJam(b.jamSelesai)} · {LABEL_STATUS[b.status] ?? b.status}
            </li>
          ))}
        </ul>
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          Pesanan terdampak tetap diproses seperti biasa dan slotnya tetap Terisi sampai selesai. Blokir dapat dibuat
          tanpa mengubah pesanan tersebut.
        </p>
        <button type="button" onClick={() => simpan(true)} disabled={kirim}
          className="btn h-12 cursor-pointer rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-60">
          {kirim ? 'Menyimpan…' : 'Tetap buat blokir'}
        </button>
        <button type="button" onClick={() => setBentrok(null)} disabled={kirim}
          className="btn h-11 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-sm font-bold">
          Kembali, ubah rentang
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={periksa} noValidate className="flex flex-col gap-4">
      {galat && <Banner nada="amber" ikon="alert">{galat}</Banner>}
      {pesan && <Banner nada="merah" ikon="alert">{pesan}</Banner>}
      <div className="flex flex-col gap-2">
        <label htmlFor="bl-lapangan" className="text-sm font-bold">Lapangan</label>
        <select id="bl-lapangan" value={lapangan} onChange={(e) => setLapangan(Number(e.target.value))}
          className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
          {daftarLapangan.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="bl-tanggal" className="text-sm font-bold">Tanggal mulai</label>
          <input id="bl-tanggal" type="date" value={tanggal}
            onChange={(e) => {
              const v = e.target.value;
              setTanggal(v);
              if (!tanggalSelesai || tanggalSelesai < v) setTanggalSelesai(v);
              setGalat('');
            }}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="bl-selesai" className="text-sm font-bold">Tanggal selesai</label>
          <input id="bl-selesai" type="date" value={tanggalSelesai} min={tanggal || undefined}
            onChange={(e) => { setTanggalSelesai(e.target.value); setGalat(''); }}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none" />
        </div>
      </div>
      <label className="flex items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={seharian} onChange={(e) => setSeharian(e.target.checked)}
          className="size-4 cursor-pointer accent-[#22C06B]" />
        Seharian penuh
      </label>
      {!seharian && (
        <div className="flex items-center gap-2.5">
          <select aria-label="Jam mulai blokir" value={jamMulai} onChange={(e) => setJamMulai(Number(e.target.value))}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
            {Array.from({ length: 18 }, (_, i) => i + 6).map((j) => <option key={j} value={j}>{formatJam(j)}</option>)}
          </select>
          <span className="font-bold">–</span>
          <select aria-label="Jam selesai blokir" value={jamSelesai} onChange={(e) => setJamSelesai(Number(e.target.value))}
            className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
            {Array.from({ length: 18 }, (_, i) => i + 7).map((j) => <option key={j} value={j}>{formatJam(j)}</option>)}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="bl-alasan" className="text-sm font-bold">Alasan</label>
        <textarea id="bl-alasan" rows={2} value={alasan} onChange={(e) => { setAlasan(e.target.value); setGalat(''); }}
          placeholder="Contoh: perbaikan lampu sorot"
          className="w-full rounded-[18px] border-[1.5px] border-line bg-white px-[18px] py-3 text-base font-medium focus:border-brand focus:outline-none" />
      </div>
      <button type="submit" disabled={kirim || daftarLapangan.length === 0}
        className="btn h-12 cursor-pointer rounded-full bg-brand px-5 text-sm font-bold text-white disabled:opacity-60">
        {kirim ? 'Memeriksa…' : 'Periksa bentrok lalu blokir'}
      </button>
    </form>
  );
}
