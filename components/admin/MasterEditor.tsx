'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@/components/auth/ui';
import { kirimApi } from './api';

export type ItemMaster = { id: number; nama: string; jumlahLapangan: number };

/** Kelola daftar induk (jenis olahraga / fasilitas): tambah, ubah nama, hapus bila tak dipakai. */
export function MasterEditor({ judul, keterangan, basis, item }: {
  judul: string; keterangan: string; basis: string; item: ItemMaster[];
}) {
  const router = useRouter();
  const [baru, setBaru] = useState('');
  const [ubah, setUbah] = useState<Record<number, string>>({});
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function jalankan(fn: () => Promise<{ ok: boolean; pesan?: string }>, sukses: string) {
    setSibuk(true);
    setPesan(null);
    const h = await fn();
    setSibuk(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Perubahan gagal disimpan.' });
      return false;
    }
    setPesan({ nada: 'teal', teks: sukses });
    router.refresh();
    return true;
  }

  return (
    <section className="rounded-[28px] border-[1.5px] border-line bg-white p-6">
      <h2 className="m-0 font-display text-[20px] font-bold tracking-[-0.02em]">{judul}</h2>
      <p className="m-0 mt-1.5 text-[13px] leading-relaxed text-muted">{keterangan}</p>

      {pesan && <div className="mt-4"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {item.length === 0 && <li className="text-sm text-muted">Belum ada data.</li>}
        {item.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={`Nama ${judul.toLowerCase()}`}
              value={ubah[x.id] ?? x.nama}
              onChange={(e) => setUbah((s) => ({ ...s, [x.id]: e.target.value }))}
              className="h-10 min-w-[160px] flex-1 rounded-xl border-[1.5px] border-line px-3 text-sm font-medium focus:border-brand focus:outline-none"
            />
            <span className="min-w-[92px] text-[12px] font-semibold text-muted">{x.jumlahLapangan} lapangan</span>
            <button type="button" disabled={sibuk}
              onClick={() => jalankan(() => kirimApi(`${basis}/${x.id}`, 'PATCH', { nama: ubah[x.id] ?? x.nama }), 'Nama tersimpan.')}
              className="h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold text-ink disabled:opacity-45">
              Simpan
            </button>
            <button type="button" disabled={sibuk || x.jumlahLapangan > 0}
              title={x.jumlahLapangan > 0 ? 'Masih dipakai lapangan' : 'Hapus'}
              onClick={() => jalankan(() => kirimApi(`${basis}/${x.id}`, 'DELETE'), 'Data dihapus.')}
              className="h-10 cursor-pointer rounded-full border-[1.5px] border-[#B42328] bg-white px-4 text-[13px] font-bold text-[#B42328] disabled:cursor-not-allowed disabled:opacity-35">
              Hapus
            </button>
          </li>
        ))}
      </ul>

      <form className="mt-4 flex flex-wrap gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (await jalankan(() => kirimApi(basis, 'POST', { nama: baru }), 'Data ditambahkan.')) setBaru('');
      }}>
        <input required value={baru} onChange={(e) => setBaru(e.target.value)} placeholder={`${judul} baru`}
          className="h-10 min-w-[180px] flex-1 rounded-xl border-[1.5px] border-line px-3 text-sm font-medium focus:border-brand focus:outline-none" />
        <button type="submit" disabled={sibuk}
          className="h-10 cursor-pointer rounded-full bg-brand px-5 text-[13px] font-bold text-white disabled:opacity-45">
          Tambah
        </button>
      </form>
    </section>
  );
}
