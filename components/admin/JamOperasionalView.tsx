'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, PilihLapangan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import { jamTanpaTarif, HARI, NAMA_HARI, formatJam, type AturanTarif, type BarisJam } from '@/lib/admin/lapangan/rules';
import { kirimApi } from './api';

const input = 'h-10 w-full min-w-[84px] rounded-xl border-[1.5px] border-line bg-white px-3 text-sm font-semibold focus:border-brand focus:outline-none';

/** Kelola jam operasional per lapangan per hari (FR-ADM-04). Standar: 06.00–24.00, buka setiap hari. */
export function JamOperasionalView({ daftar, aktifId, lapanganNama, baris: awal, tarif }: {
  daftar: { id: number; nama: string }[];
  aktifId: number;
  lapanganNama: string;
  baris: BarisJam[];
  tarif: AturanTarif[];
}) {
  const router = useRouter();
  const [baris, setBaris] = useState<BarisJam[]>(() => (
    awal.length > 0
      ? awal.map((b) => ({ ...b }))
      // Lapangan baru belum punya baris: mulai dari standar 7 hari 06.00–24.00 agar bisa langsung disimpan.
      : HARI.map((hari) => ({ hari, buka: true, jamBuka: 6, jamTutup: 24 }))
  ));
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'amber' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);
  const hilang = jamTanpaTarif(tarif, baris);

  const ubah = (hari: number, patch: Partial<BarisJam>) =>
    setBaris((s) => s.map((b) => (b.hari === hari ? { ...b, ...patch } : b)));

  function terapkanSemua() {
    const contoh = baris.find((b) => b.buka) ?? { jamBuka: 6, jamTutup: 24 };
    setBaris((s) => s.map((b) => ({ ...b, jamBuka: contoh.jamBuka, jamTutup: contoh.jamTutup })));
  }

  async function simpan() {
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/lapangan/${aktifId}/jam`, 'PUT', { baris });
    setKirim(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Jam operasional gagal disimpan.' });
      return;
    }
    setPesan({ nada: 'teal', teks: 'Jam operasional tersimpan.' });
    router.refresh();
  }

  return (
    <AdminShell aktif="Jam operasional" judul="Jam operasional"
      keterangan={`Atur jam buka dan tutup tiap hari untuk ${lapanganNama}. Jam di luar rentang ini otomatis tampil Tidak tersedia.`}>
      <PilihLapangan daftar={daftar} aktifId={aktifId} basis="/admin/jam-operasional" />

      <div className="mt-6">
        {pesan ? (
          <Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner>
        ) : hilang.length > 0 ? (
          <Banner nada="amber" ikon="alert">
            Perubahan ini membuka {hilang.length} jam yang belum punya tarif. Lengkapi tarif lebih dulu, atau tutup kembali jam tersebut.
          </Banner>
        ) : (
          <Banner nada="teal" ikon="check" role="status">Semua jam buka sudah tertutup tarif.</Banner>
        )}
      </div>

      <div className="mt-6">
        <Tabel ariaLabel={`Jam operasional ${lapanganNama}`} head={['Hari', 'Status', 'Jam buka', 'Jam tutup', 'Aksi']}
          kosong={baris.length === 0 ? 'Belum ada jam operasional.' : undefined}>
          {baris.map((b) => (
            <tr key={b.hari} className="border-b border-line last:border-b-0">
              <Td strong>{NAMA_HARI[b.hari - 1]}</Td>
              <Td>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={b.buka} onChange={(e) => ubah(b.hari, { buka: e.target.checked })}
                    className="size-4 accent-[#0E8A4A]" />
                  {b.buka ? 'Buka' : 'Tutup'}
                </label>
              </Td>
              <Td>
                <input aria-label={`Jam buka ${NAMA_HARI[b.hari - 1]}`} type="number" min={6} max={23} step={1}
                  disabled={!b.buka} value={b.jamBuka}
                  onChange={(e) => ubah(b.hari, { jamBuka: Number(e.target.value) })}
                  className={`${input} disabled:opacity-40`} />
              </Td>
              <Td>
                <input aria-label={`Jam tutup ${NAMA_HARI[b.hari - 1]}`} type="number" min={7} max={24} step={1}
                  disabled={!b.buka} value={b.jamTutup}
                  onChange={(e) => ubah(b.hari, { jamTutup: Number(e.target.value) })}
                  className={`${input} disabled:opacity-40`} />
              </Td>
              <Td kanan><span className="text-[13px] font-semibold text-muted">{b.buka ? `${formatJam(b.jamBuka)}–${formatJam(b.jamTutup)}` : '—'}</span></Td>
            </tr>
          ))}
        </Tabel>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={terapkanSemua}
          className="h-11 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[14px] font-bold text-ink">
          Terapkan jam hari pertama ke semua hari
        </button>
        <button type="button" onClick={simpan} disabled={kirim || hilang.length > 0}
          title={hilang.length > 0 ? 'Lengkapi tarif untuk jam yang baru dibuka' : undefined}
          className="h-11 cursor-pointer rounded-full bg-brand px-6 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          {kirim ? 'Menyimpan…' : 'Simpan jam operasional'}
        </button>
      </div>

      <Catatan>
        Slot yang dibuka harus tertutup tarif. Jam di luar jam operasional dan hari Tutup tidak dapat dipesan dan tampil
        <strong> Tidak tersedia</strong> pada kalender penyewa.
      </Catatan>
    </AdminShell>
  );
}
