'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { BarisPengguna } from '@/lib/admin/pengguna/data';
import { kirimApi } from './api';

type Target = { pengguna: BarisPengguna; aktif: boolean };
type SaringPeran = 'semua' | 'penyewa' | 'admin';
type SaringStatus = 'semua' | 'aktif' | 'nonaktif';

const PILIH = 'h-11 cursor-pointer rounded-full border-[1.5px] border-line bg-white px-4 text-sm font-bold focus:border-brand focus:outline-none';

/** Kelola pengguna (FR-ADM-10): cari/filter, lihat status, aktif/nonaktif dengan konfirmasi. */
export function PenggunaView({ daftar, aktorId }: { daftar: BarisPengguna[]; aktorId: number }) {
  const router = useRouter();
  const [cari, setCari] = useState('');
  const [peran, setPeran] = useState<SaringPeran>('semua');
  const [status, setStatus] = useState<SaringStatus>('semua');
  const [target, setTarget] = useState<Target | null>(null);
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return daftar.filter((u) => {
      if (peran !== 'semua' && u.peran !== peran) return false;
      if (status === 'aktif' && !u.aktif) return false;
      if (status === 'nonaktif' && u.aktif) return false;
      if (!q) return true;
      return u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.kontak.toLowerCase().includes(q);
    });
  }, [daftar, cari, peran, status]);

  async function ubah() {
    if (!target) return;
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/pengguna/${target.pengguna.id}/aktif`, 'POST', { aktif: target.aktif });
    setKirim(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Status pengguna gagal diubah.' });
      return;
    }
    setPesan({
      nada: 'teal',
      teks: target.aktif
        ? `${target.pengguna.nama} diaktifkan kembali dan dapat membuat pesanan baru.`
        : `${target.pengguna.nama} dinonaktifkan. Sesi berikutnya ditolak; pesanan berjalan tetap diproses.`,
    });
    setTarget(null);
    router.refresh();
  }

  return (
    <AdminShell aktif="Pengguna" judul="Pengguna"
      keterangan="Daftar semua pengguna terdaftar. Menonaktifkan pengguna mencegah pesanan baru tanpa menghapus data (PRD 8.8).">
      {pesan && <div className="mb-4"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

      {target && (
        <div className="mb-4 flex flex-col gap-3 rounded-[22px] border-[1.5px] border-[#E0A800] bg-[#FFF8E1] p-5">
          <div className="text-sm font-semibold">
            {target.aktif ? 'Aktifkan kembali' : 'Nonaktifkan'} <b>{target.pengguna.nama}</b> ({target.pengguna.email})?
          </div>
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            {target.aktif
              ? 'Pengguna dapat masuk dan membuat pesanan baru lagi.'
              : 'Pengguna tidak dapat masuk atau membuat pesanan baru. Riwayat dan pesanan yang sedang berjalan tetap diproses (PRD 8.8).'}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={ubah} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full bg-brand px-5 text-[13px] font-bold text-white disabled:opacity-60">
              {kirim ? 'Menyimpan…' : target.aktif ? 'Ya, aktifkan' : 'Ya, nonaktifkan'}
            </button>
            <button type="button" onClick={() => setTarget(null)} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[13px] font-bold">
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari pengguna"
          placeholder="Cari nama, email, atau kontak"
          className="h-11 w-full max-w-[320px] rounded-full border-[1.5px] border-line bg-white px-4 text-sm font-semibold focus:border-brand focus:outline-none" />
        <select aria-label="Saring peran" value={peran} onChange={(e) => setPeran(e.target.value as SaringPeran)} className={PILIH}>
          <option value="semua">Semua peran</option>
          <option value="penyewa">Penyewa</option>
          <option value="admin">Admin</option>
        </select>
        <select aria-label="Saring status" value={status} onChange={(e) => setStatus(e.target.value as SaringStatus)} className={PILIH}>
          <option value="semua">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
        <span className="text-[13px] font-semibold text-muted">{hasil.length} dari {daftar.length} pengguna</span>
      </div>

      <Tabel
        ariaLabel="Daftar pengguna"
        head={['Nama', 'Email', 'Kontak', 'Peran', 'Pesanan', 'Gabung', 'Status', 'Aksi']}
        kosong={hasil.length === 0 ? 'Tidak ada pengguna yang cocok dengan pencarian/filter.' : undefined}
      >
        {hasil.map((u) => (
          <tr key={u.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
            <Td strong>
              {u.nama}
              {u.id === aktorId && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-[11px] font-bold text-muted">Akun kamu</span>}
            </Td>
            <Td>{u.email}</Td>
            <Td>{u.kontak}</Td>
            <Td>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${u.peran === 'admin' ? 'bg-ink text-white' : 'bg-mist text-ink'}`}>
                {u.peran === 'admin' ? 'Admin' : 'Penyewa'}
              </span>
            </Td>
            <Td strong>{u.jumlahPesanan}</Td>
            <Td>{u.gabung}</Td>
            <Td>
              <div className="flex flex-col items-start gap-1.5">
                {u.aktif ? (
                  <span className="inline-flex items-center rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-[#0A6B3A]">Aktif</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#E3EAE6] px-3 py-1 text-[13px] font-bold text-[#4F6358]">Nonaktif</span>
                )}
                {!u.terverifikasi && (
                  <span className="inline-flex items-center rounded-full bg-[#FFF1D6] px-3 py-1 text-[12px] font-bold text-[#7A4B00]">Email belum terverifikasi</span>
                )}
              </div>
            </Td>
            <Td kanan>
              {u.peran === 'penyewa' ? (
                <button type="button" onClick={() => { setTarget({ pengguna: u, aktif: !u.aktif }); setPesan(null); }}
                  aria-label={`${u.aktif ? 'Nonaktifkan' : 'Aktifkan kembali'} ${u.nama}`}
                  className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold">
                  {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              ) : (
                <span className="text-[13px] font-semibold text-muted">Akun admin</span>
              )}
            </Td>
          </tr>
        ))}
      </Tabel>
      <Catatan>
        Hanya akun penyewa yang dapat dinonaktifkan. Akun admin dilindungi agar panel tidak kehilangan pengelola.
        Penonaktifan tidak menghapus data maupun pesanan; pesanan yang sedang berjalan tetap diproses sampai selesai.
      </Catatan>
    </AdminShell>
  );
}
