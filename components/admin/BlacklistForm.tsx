'use client';

import { useState, type FormEvent } from 'react';
import { Banner } from '@/components/auth/ui';
import { formatJam } from '@/lib/format';

/** Form tambah blokir (FR-ADM-05). FE dulu: menghitung bentrok dari daftar demo; simpan ke backend menyusul. */
export default function BlacklistForm({ daftarLapangan, bentrokDemo }: {
  daftarLapangan: { id: number; nama: string }[]; bentrokDemo: string[];
}) {
  const [lapangan, setLapangan] = useState(daftarLapangan[0]?.id ?? 0);
  const [tanggal, setTanggal] = useState('');
  const [seharian, setSeharian] = useState(true);
  const [jamMulai, setJamMulai] = useState(6);
  const [jamSelesai, setJamSelesai] = useState(12);
  const [alasan, setAlasan] = useState('');
  const [galat, setGalat] = useState('');
  const [bentrok, setBentrok] = useState<string[] | null>(null);
  const [sukses, setSukses] = useState(false);

  function kirim(e: FormEvent) {
    e.preventDefault();
    if (!tanggal) { setGalat('Pilih tanggal mulai blokir.'); return; }
    if (!seharian && jamSelesai <= jamMulai) { setGalat('Jam selesai harus setelah jam mulai.'); return; }
    if (alasan.trim().length < 5) { setGalat('Tuliskan alasan blokir minimal 5 karakter.'); return; }
    setGalat('');
    // FE dulu: bentrok dihitung dari dummy. Backend menyusul: query pesanan aktif yang menimpa rentang (AC-15).
    const namaLap = daftarLapangan.find((l) => l.id === lapangan)?.nama ?? '';
    const adaBentrok = namaLap.includes('Futsal') || namaLap.includes('Mini');
    setBentrok(adaBentrok ? bentrokDemo : []);
  }

  function konfirmasi() {
    setBentrok(null);
    setSukses(true);
  }

  if (sukses) {
    return (
      <div className="flex flex-col gap-4">
        <Banner nada="teal" ikon="check" role="status">Blokir tersimpan (mode tampilan). Slot terblokir langsung tampil Terisi pada kalender penyewa.</Banner>
        <button type="button" onClick={() => { setSukses(false); setTanggal(''); setAlasan(''); }}
          className="btn h-11 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-sm font-bold">
          Tambah blokir lain
        </button>
      </div>
    );
  }

  if (bentrok !== null && bentrok.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <Banner nada="merah" ikon="alert">
          {bentrok.length} pesanan aktif menimpa rentang blokir ini. Konfirmasi untuk membatalkannya dan melepas slot:
        </Banner>
        <ul className="m-0 flex list-none flex-col gap-1.5 rounded-[18px] bg-white p-4 text-[13px] font-semibold">
          {bentrok.map((b) => <li key={b}>· {b}</li>)}
        </ul>
        <p className="text-[13px] text-muted">
          Penyewa diberi tahu dengan alasan &ldquo;dibatalkan oleh pengelola&rdquo; (AC-15). Tindakan ini tidak dapat dibatalkan.
        </p>
        <button type="button" onClick={konfirmasi}
          className="btn h-12 cursor-pointer rounded-full bg-brand px-5 text-sm font-bold text-white">
          Konfirmasi &amp; batalkan pesanan terdampak
        </button>
        <button type="button" onClick={() => setBentrok(null)}
          className="btn h-11 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-sm font-bold">
          Kembali, ubah rentang
        </button>
      </div>
    );
  }

  if (bentrok !== null) {
    return (
      <div className="flex flex-col gap-4">
        <Banner nada="teal" ikon="check" role="status">Tidak ada pesanan aktif yang menimpa rentang ini. Blokir dapat langsung dibuat.</Banner>
        <button type="button" onClick={konfirmasi}
          className="btn h-12 cursor-pointer rounded-full bg-brand px-5 text-sm font-bold text-white">Buat blokir</button>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
      {galat && <Banner nada="amber" ikon="alert">{galat}</Banner>}
      <div className="flex flex-col gap-2">
        <label htmlFor="bl-lapangan" className="text-sm font-bold">Lapangan</label>
        <select id="bl-lapangan" value={lapangan} onChange={(e) => setLapangan(Number(e.target.value))}
          className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none">
          {daftarLapangan.map((l) => <option key={l.id} value={l.id}>{l.nama}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="bl-tanggal" className="text-sm font-bold">Tanggal</label>
        <input id="bl-tanggal" type="date" value={tanggal} onChange={(e) => { setTanggal(e.target.value); setGalat(''); }}
          className="h-[54px] w-full rounded-[18px] border-[1.5px] border-line bg-white px-[14px] text-base font-medium focus:border-brand focus:outline-none" />
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
      <button type="submit" className="btn h-12 cursor-pointer rounded-full bg-brand px-5 text-sm font-bold text-white">
        Periksa bentrok lalu blokir
      </button>
    </form>
  );
}
