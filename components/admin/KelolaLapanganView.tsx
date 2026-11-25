'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { BarisLapanganAdmin, LapanganEdit, MasterLapangan } from '@/lib/admin/lapangan/data';
import { formatRupiah } from '@/lib/format';
import { kirimApi } from './api';
import { MasterEditor } from './MasterEditor';

type FormLapangan = {
  id: number | null;
  nama: string;
  jenisOlahragaId: number;
  deskripsi: string;
  alamat: string;
  latitude: string;
  longitude: string;
  fasilitasIds: number[];
  aktif: boolean;
};

const input = 'h-11 w-full rounded-xl border-[1.5px] border-line bg-white px-3 text-sm font-semibold focus:border-brand focus:outline-none';

const formDari = (l: LapanganEdit): FormLapangan => ({
  id: l.id,
  nama: l.nama,
  jenisOlahragaId: l.jenisOlahragaId,
  deskripsi: l.deskripsi ?? '',
  alamat: l.alamat ?? '',
  latitude: l.latitude === null ? '' : String(l.latitude),
  longitude: l.longitude === null ? '' : String(l.longitude),
  fasilitasIds: [...l.fasilitasIds],
  aktif: l.aktif,
});

const formKosong = (master: MasterLapangan): FormLapangan => ({
  id: null, nama: '', jenisOlahragaId: master.jenis[0]?.id ?? 0, deskripsi: '', alamat: '',
  latitude: '', longitude: '', fasilitasIds: [], aktif: true,
});

function BadgeAktif({ aktif }: { aktif: boolean }) {
  return aktif ? (
    <span className="inline-flex items-center rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-[#0A6B3A]">Aktif</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-[#E3EAE6] px-3 py-1 text-[13px] font-bold text-[#4F6358]">Nonaktif</span>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-muted">{children}</span>;
}

/** Kelola lapangan: daftar, tambah/ubah, fasilitas, dan status aktif (FR-ADM-02, BR-17). */
export function KelolaLapanganView({ daftar, detail, master }: {
  daftar: BarisLapanganAdmin[];
  detail: LapanganEdit[];
  master: MasterLapangan;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormLapangan | null>(null);
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<number | null>(null);

  const ubah = <K extends keyof FormLapangan>(k: K, v: FormLapangan[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  function bukaUbah(id: number) {
    const l = detail.find((x) => x.id === id);
    if (l) { setForm(formDari(l)); setPesan(null); }
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSibuk(true);
    setPesan(null);
    const body = {
      nama: form.nama,
      jenisOlahragaId: form.jenisOlahragaId,
      deskripsi: form.deskripsi,
      alamat: form.alamat,
      latitude: form.latitude.trim() === '' ? null : Number(form.latitude),
      longitude: form.longitude.trim() === '' ? null : Number(form.longitude),
      fasilitasIds: form.fasilitasIds,
      aktif: form.aktif,
    };
    const h = form.id === null
      ? await kirimApi('/api/admin/lapangan', 'POST', body)
      : await kirimApi(`/api/admin/lapangan/${form.id}`, 'PATCH', body);
    setSibuk(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Lapangan gagal disimpan.' });
      return;
    }
    setForm(null);
    setPesan({ nada: 'teal', teks: form.id === null ? 'Lapangan ditambahkan.' : 'Lapangan diperbarui.' });
    router.refresh();
  }

  async function ubahAktif(l: BarisLapanganAdmin) {
    setSibuk(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/lapangan/${l.id}/aktif`, 'POST', { aktif: !l.aktif });
    setSibuk(false);
    setKonfirmasi(null);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Status lapangan gagal diubah.' });
      return;
    }
    setPesan({ nada: 'teal', teks: l.aktif ? `${l.nama} dinonaktifkan dari halaman publik.` : `${l.nama} diaktifkan kembali.` });
    router.refresh();
  }

  return (
    <AdminShell aktif="Lapangan" judul="Kelola lapangan"
      keterangan="Tambah, ubah, dan nonaktifkan lapangan. Lapangan dinonaktifkan, bukan dihapus, agar riwayat dan rekap tetap utuh.">
      {pesan && <div className="mb-5"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

      {form ? (
        <form onSubmit={simpan} className="mb-6 rounded-[28px] border-[1.5px] border-line bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 font-display text-[22px] font-bold tracking-[-0.02em]">{form.id === null ? 'Tambah lapangan' : 'Ubah lapangan'}</h2>
            <button type="button" onClick={() => { setForm(null); setPesan(null); }}
              className="cursor-pointer rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-bold text-muted">
              Batal
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <Label>Nama lapangan</Label>
              <input required minLength={3} maxLength={80} value={form.nama} onChange={(e) => ubah('nama', e.target.value)} className={input} />
            </label>
            <label className="block">
              <Label>Jenis olahraga</Label>
              <select required value={form.jenisOlahragaId} onChange={(e) => ubah('jenisOlahragaId', Number(e.target.value))} className={input}>
                {master.jenis.length === 0 && <option value={0}>Belum ada jenis olahraga</option>}
                {master.jenis.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2">
              <Label>Deskripsi</Label>
              <textarea rows={3} maxLength={1000} value={form.deskripsi} onChange={(e) => ubah('deskripsi', e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm font-medium focus:border-brand focus:outline-none" />
            </label>
            <label className="block md:col-span-2">
              <Label>Alamat</Label>
              <input maxLength={500} value={form.alamat} onChange={(e) => ubah('alamat', e.target.value)} className={input} />
            </label>
            <label className="block">
              <Label>Latitude (opsional)</Label>
              <input inputMode="decimal" value={form.latitude} onChange={(e) => ubah('latitude', e.target.value)} placeholder="-6.90344" className={input} />
            </label>
            <label className="block">
              <Label>Longitude (opsional)</Label>
              <input inputMode="decimal" value={form.longitude} onChange={(e) => ubah('longitude', e.target.value)} placeholder="107.64980" className={input} />
            </label>
          </div>

          <fieldset className="mt-5 border-0 p-0">
            <legend className="text-[12px] font-bold uppercase tracking-wider text-muted">Fasilitas</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {master.fasilitas.length === 0 && <span className="text-sm text-muted">Belum ada fasilitas. Tambahkan di bawah.</span>}
              {master.fasilitas.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] border-line px-3 py-2 text-sm font-semibold">
                  <input type="checkbox" className="size-4 accent-[#0E8A4A]" checked={form.fasilitasIds.includes(f.id)}
                    onChange={(e) => ubah('fasilitasIds', e.target.checked
                      ? [...form.fasilitasIds, f.id]
                      : form.fasilitasIds.filter((id) => id !== f.id))} />
                  {f.nama}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-4 accent-[#0E8A4A]" checked={form.aktif} onChange={(e) => ubah('aktif', e.target.checked)} />
            Tampilkan di halaman publik (aktif)
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={sibuk || master.jenis.length === 0}
              className="h-11 cursor-pointer rounded-full bg-brand px-6 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
              {sibuk ? 'Menyimpan…' : form.id === null ? 'Tambah lapangan' : 'Simpan perubahan'}
            </button>
            <span className="self-center text-[13px] text-muted">Isi koordinat berdua atau kosongkan berdua.</span>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => { setForm(formKosong(master)); setPesan(null); }} disabled={master.jenis.length === 0}
          className="mb-6 h-11 cursor-pointer rounded-full bg-brand px-6 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          + Tambah lapangan
        </button>
      )}

      <Tabel ariaLabel="Daftar lapangan" head={['Nama', 'Jenis olahraga', 'Harga mulai', 'Pesanan mendatang', 'Status', 'Aksi']}>
        {daftar.map((l) => (
          <tr key={l.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
            <Td strong>{l.nama}</Td>
            <Td>{l.olahraga}</Td>
            <Td strong>{l.hargaMulai > 0 ? <>{formatRupiah(l.hargaMulai)} <span className="text-[13px] font-medium text-muted">/ jam</span></> : <span className="text-[13px] font-medium text-muted">Belum ada tarif</span>}</Td>
            <Td>{l.jumlahPesananMendatang}</Td>
            <Td><BadgeAktif aktif={l.aktif} /></Td>
            <Td kanan>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => bukaUbah(l.id)}
                  className="cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-4 py-2 text-[13px] font-bold text-ink">
                  Ubah
                </button>
                {konfirmasi === l.id ? (
                  <>
                    <button type="button" disabled={sibuk} onClick={() => ubahAktif(l)}
                      className={`cursor-pointer rounded-full border-0 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-45 ${l.aktif ? 'bg-[#B42328]' : 'bg-brand'}`}>
                      Ya, {l.aktif ? 'nonaktifkan' : 'aktifkan'}
                    </button>
                    <button type="button" onClick={() => setKonfirmasi(null)}
                      className="cursor-pointer rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-bold text-muted">
                      Batal
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setKonfirmasi(l.id)}
                    className={`cursor-pointer rounded-full border-[1.5px] bg-white px-4 py-2 text-[13px] font-bold ${l.aktif ? 'border-[#B42328] text-[#B42328]' : 'border-brand text-brand'}`}>
                    {l.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </Tabel>

      <Catatan>
        Menonaktifkan lapangan tidak membatalkan pesanan aktifnya; pesanan berjalan tetap diproses sampai selesai.
      </Catatan>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <MasterEditor judul="Jenis olahraga" keterangan="Daftar jenis olahraga yang bisa dipilih saat menambah lapangan."
          basis="/api/admin/jenis-olahraga" item={master.jenis} />
        <MasterEditor judul="Fasilitas" keterangan="Fasilitas yang dapat dipilih per lapangan. Fasilitas yang masih dipakai tidak bisa dihapus."
          basis="/api/admin/fasilitas" item={master.fasilitas} />
      </div>
    </AdminShell>
  );
}
