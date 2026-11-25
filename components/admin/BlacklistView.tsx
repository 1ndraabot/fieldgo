'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { BarisBlokir, LapanganRingkas } from '@/lib/admin/blacklist/data';
import { formatJam, labelPanjang } from '@/lib/format';
import { kirimApi } from './api';
import BlacklistForm from './BlacklistForm';

const rentangJam = (b: BarisBlokir) =>
  b.jamMulai === null || b.jamSelesai === null ? 'Seharian' : `${formatJam(b.jamMulai)}–${formatJam(b.jamSelesai)}`;

const rentangTanggal = (b: BarisBlokir) =>
  b.tanggalMulai === b.tanggalSelesai ? labelPanjang(b.tanggalMulai) : `${labelPanjang(b.tanggalMulai)} – ${labelPanjang(b.tanggalSelesai)}`;

/** Kelola blacklist/pemblokiran jadwal (FR-ADM-05): daftar blokir aktif + form dengan konfirmasi bentrok (AC-15, BR-14). */
export function BlacklistView({ daftarLapangan, baris }: {
  daftarLapangan: LapanganRingkas[];
  baris: BarisBlokir[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<BarisBlokir | null>(null);
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  async function hapuskan(b: BarisBlokir) {
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/blacklist/${b.id}`, 'DELETE');
    setKirim(false);
    setTarget(null);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Blokir gagal dihapus.' });
      return;
    }
    setPesan({ nada: 'teal', teks: `Blokir ${b.lapanganNama} dihapus. Slotnya langsung dapat dipesan kembali.` });
    router.refresh();
  }

  return (
    <AdminShell aktif="Blacklist" judul="Blacklist jadwal"
      keterangan="Blokir slot untuk perbaikan atau acara internal. Slot terblokir tidak dapat dipesan dan tampil Terisi pada kalender penyewa.">
      <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
        <div>
          {pesan && <div className="mb-4"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

          {target && (
            <div className="mb-4 flex flex-col gap-3 rounded-[22px] border-[1.5px] border-[#E0A800] bg-[#FFF8E1] p-5">
              <div className="text-sm font-semibold">
                Hapus blokir <b>{target.lapanganNama}</b> ({rentangTanggal(target)}, {rentangJam(target)})?
              </div>
              <p className="m-0 text-[13px] leading-relaxed text-muted">
                Slot akan langsung dapat dipesan kembali. Pesanan lama yang sudah ada tidak terpengaruh.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button type="button" onClick={() => hapuskan(target)} disabled={kirim}
                  className="btn h-10 cursor-pointer rounded-full bg-brand px-5 text-[13px] font-bold text-white disabled:opacity-60">
                  {kirim ? 'Menghapus…' : 'Ya, hapus blokir'}
                </button>
                <button type="button" onClick={() => setTarget(null)} disabled={kirim}
                  className="btn h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[13px] font-bold">
                  Batal
                </button>
              </div>
            </div>
          )}

          <Tabel
            ariaLabel="Daftar blokir jadwal"
            head={['Lapangan', 'Tanggal', 'Jam', 'Alasan', 'Aksi']}
            kosong={baris.length === 0 ? 'Belum ada blokir aktif. Tambahkan dari form di samping.' : undefined}
          >
            {baris.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                <Td strong>{b.lapanganNama}</Td>
                <Td>{rentangTanggal(b)}</Td>
                <Td>{rentangJam(b)}</Td>
                <Td>
                  {b.alasan}
                  {b.adminNama && <span className="mt-1 block text-[12px] font-medium text-muted">oleh {b.adminNama}</span>}
                </Td>
                <Td kanan>
                  <button type="button" onClick={() => { setTarget(b); setPesan(null); }} aria-label={`Hapus blokir ${b.lapanganNama}`}
                    className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold">
                    Hapus
                  </button>
                </Td>
              </tr>
            ))}
          </Tabel>
          <Catatan>
            Blokir tidak membatalkan pesanan yang sudah ada. Pesanan terdampak tetap diproses dan slotnya tetap
            tampil Terisi sampai selesai; blokir hanya menolak pemesanan baru pada rentang tersebut.
          </Catatan>
        </div>

        <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
          <h2 className="font-display text-xl font-bold">Tambah blokir</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Jika blokir menimpa pesanan aktif, sistem meminta konfirmasi. Pesanan tersebut tetap berjalan dan tidak
            dibatalkan.
          </p>
          <div className="mt-5">
            <BlacklistForm daftarLapangan={daftarLapangan} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
