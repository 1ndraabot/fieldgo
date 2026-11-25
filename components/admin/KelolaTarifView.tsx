'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, PilihLapangan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import { jamTanpaTarif, labelTipeHari, formatJam, type AturanTarif, type BarisJam } from '@/lib/admin/lapangan/rules';
import { formatRupiah } from '@/lib/format';
import { kirimApi } from './api';

type Baris = AturanTarif & { key: number };
const input = 'h-10 w-full min-w-[92px] rounded-xl border-[1.5px] border-line bg-white px-3 text-sm font-semibold focus:border-brand focus:outline-none';

/** Kelola tarif: harga per jam per tipe hari dan rentang jam (FR-ADM-03, BR-15). */
export function KelolaTarifView({ daftar, aktifId, lapanganNama, aturan, jam }: {
  daftar: { id: number; nama: string }[];
  aktifId: number;
  lapanganNama: string;
  aturan: AturanTarif[];
  jam: BarisJam[];
}) {
  const router = useRouter();
  const [baris, setBaris] = useState<Baris[]>(() => aturan.map((a, i) => ({ ...a, key: i })));
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'amber' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);
  const hilang = jamTanpaTarif(baris, jam);
  const berikut = Math.max(0, ...baris.map((b) => b.key)) + 1;

  const ubah = (key: number, patch: Partial<AturanTarif>) =>
    setBaris((s) => s.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  async function simpan() {
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/lapangan/${aktifId}/tarif`, 'PUT', {
      aturan: baris.map(({ tipeHari, jamMulai, jamSelesai, hargaPerJam }) => ({ tipeHari, jamMulai, jamSelesai, hargaPerJam })),
    });
    setKirim(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Tarif gagal disimpan.' });
      return;
    }
    setPesan({ nada: 'teal', teks: 'Tarif tersimpan. Pesanan lama tetap memakai harga saat dibuat.' });
    router.refresh();
  }

  return (
    <AdminShell aktif="Tarif" judul="Kelola tarif"
      keterangan="Harga per jam berdasarkan tipe hari (hari kerja / akhir pekan) dan rentang jam. Rentang tidak boleh tumpang tindih dan seluruh jam operasional harus tertutup tarif (FR-ADM-03).">
      <PilihLapangan daftar={daftar} aktifId={aktifId} basis="/admin/tarif" />

      <div className="mt-6">
        {pesan ? (
          <Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner>
        ) : jam.length === 0 ? (
          <Banner nada="amber" ikon="alert">
            Jam operasional {lapanganNama} belum diatur, jadi belum ada jam yang perlu ditutup tarif. Atur dulu di
            <strong> Jam operasional</strong> agar tarif bisa dihitung terhadap jam buka.
          </Banner>
        ) : hilang.length > 0 ? (
          <Banner nada="amber" ikon="alert">
            {hilang.length} jam belum ditutup tarif ({hilang.slice(0, 4).map((h) => `${formatJam(h.jam)} (${h.tipeHari})`).join(', ')}
            {hilang.length > 4 ? ' …' : ''}). Jam tanpa tarif tidak boleh dibuka untuk dipesan (BR-15) dan tampil Tidak tersedia (AC-20).
          </Banner>
        ) : (
          <Banner nada="teal" ikon="check" role="status">Seluruh jam operasional {lapanganNama} sudah tertutup tarif.</Banner>
        )}
      </div>

      <div className="mt-6">
        <Tabel ariaLabel={`Tarif ${lapanganNama}`} head={['Tipe hari', 'Jam mulai', 'Jam selesai', 'Harga / jam', 'Aksi']}
          kosong={baris.length === 0 ? 'Belum ada tarif. Tambahkan minimal satu rentang untuk setiap tipe hari yang buka.' : undefined}>
          {baris.map((t) => (
            <tr key={t.key} className="border-b border-line last:border-b-0">
              <Td>
                <select aria-label="Tipe hari" value={t.tipeHari}
                  onChange={(e) => ubah(t.key, { tipeHari: e.target.value as AturanTarif['tipeHari'] })}
                  className={input}>
                  <option value="weekday">Hari kerja</option>
                  <option value="weekend">Akhir pekan</option>
                </select>
              </Td>
              <Td>
                <input aria-label="Jam mulai" type="number" min={6} max={23} step={1} value={t.jamMulai}
                  onChange={(e) => ubah(t.key, { jamMulai: Number(e.target.value) })} className={input} />
              </Td>
              <Td>
                <input aria-label="Jam selesai" type="number" min={7} max={24} step={1} value={t.jamSelesai}
                  onChange={(e) => ubah(t.key, { jamSelesai: Number(e.target.value) })} className={input} />
              </Td>
              <Td>
                <input aria-label="Harga per jam" type="number" min={1} step={1000} value={t.hargaPerJam}
                  onChange={(e) => ubah(t.key, { hargaPerJam: Number(e.target.value) })} className={input} />
                <div className="mt-1 text-[12px] font-medium text-muted">{formatRupiah(t.hargaPerJam)}</div>
              </Td>
              <Td kanan>
                <button type="button" onClick={() => setBaris((s) => s.filter((b) => b.key !== t.key))}
                  className="cursor-pointer rounded-full border-[1.5px] border-[#B42328] bg-white px-4 py-2 text-[13px] font-bold text-[#B42328]">
                  Hapus
                </button>
              </Td>
            </tr>
          ))}
        </Tabel>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button"
          onClick={() => setBaris((s) => [...s, { key: berikut, tipeHari: 'weekday', jamMulai: 6, jamSelesai: 24, hargaPerJam: 90_000 }])}
          className="h-11 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[14px] font-bold text-ink">
          + Tambah tarif
        </button>
        <button type="button" onClick={simpan} disabled={kirim || hilang.length > 0}
          title={hilang.length > 0 ? 'Lengkapi seluruh jam operasional lebih dulu' : undefined}
          className="h-11 cursor-pointer rounded-full bg-brand px-6 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          {kirim ? 'Menyimpan…' : 'Simpan tarif'}
        </button>
        <span className="text-[13px] text-muted">{baris.length} rentang · {labelTipeHari('weekday')} &amp; {labelTipeHari('weekend')}</span>
      </div>

      <Catatan>
        Perubahan tarif <strong>tidak memengaruhi pesanan yang sudah dibuat</strong> — harga dikunci saat pesanan dibuat (BR-06).
      </Catatan>
    </AdminShell>
  );
}
