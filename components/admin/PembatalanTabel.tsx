'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { BarisBatal } from '@/lib/admin/pengecualian/data';
import { formatRupiah, labelDibuat, labelPanjang } from '@/lib/format';
import { kirimApi } from './api';

type Panel = { baris: BarisBatal; aksi: 'setujui' | 'tolak'; catatan: string; nominal: string } | null;

/** Antrean pengajuan pembatalan penyewa (FR-ADM-07, BR-13): setujui → refund, tolak → kembali Terkonfirmasi. */
export function PembatalanTabel({ baris }: { baris: BarisBatal[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  function buka(b: BarisBatal, aksi: 'setujui' | 'tolak') {
    setPesan(null);
    setPanel({ baris: b, aksi, catatan: '', nominal: String(b.totalHarga) });
  }

  async function putuskan() {
    if (!panel) return;
    setKirim(true);
    setPesan(null);
    const nominal = Number.parseInt(panel.nominal, 10);
    const h = await kirimApi(`/api/admin/verifikasi/batal/${panel.baris.kode}`, 'POST', {
      aksi: panel.aksi,
      catatan: panel.catatan,
      nominalRefund: panel.aksi === 'setujui' && Number.isInteger(nominal) && nominal > 0 ? nominal : undefined,
    });
    setKirim(false);
    const kode = panel.baris.kode;
    const aksi = panel.aksi;
    setPanel(null);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Putusan gagal disimpan.' });
      return;
    }
    setPesan({
      nada: 'teal',
      teks: aksi === 'setujui'
        ? `Pembatalan ${kode} disetujui — pesanan Dibatalkan, slot bebas, dan refund dibuat menuju rekening penyewa.`
        : `Pengajuan ${kode} ditolak — pesanan kembali Terkonfirmasi dan slot tetap terisi.`,
    });
    router.refresh();
  }

  return (
    <div>
      {pesan && <div className="mb-4"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

      {panel && (
        <div className="mb-4 flex flex-col gap-3 rounded-[22px] border-[1.5px] border-[#E0A800] bg-[#FFF8E1] p-5">
          <div className="text-sm font-semibold">
            {panel.aksi === 'setujui' ? 'Setujui' : 'Tolak'} pembatalan pesanan <b>{panel.baris.kode}</b> ({panel.baris.penyewa})?
          </div>
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            {panel.aksi === 'setujui'
              ? `Pesanan menjadi Dibatalkan dan slot langsung dapat dipesan ulang. Refund dikirim ke ${panel.baris.namaBank} ${panel.baris.nomorRekening} a.n. ${panel.baris.atasNama}.`
              : 'Pesanan kembali Terkonfirmasi dan slot tetap terisi. Catatan penolakan tampil di detail pesanan penyewa — tulis dengan jelas.'}
          </p>
          {panel.aksi === 'setujui' && (
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">
              Nominal refund (Rp)
              <input type="number" min={0} max={100_000_000} value={panel.nominal}
                onChange={(e) => setPanel({ ...panel, nominal: e.target.value })}
                className="w-56 rounded-2xl border-[1.5px] border-line bg-white px-4 py-2.5 text-[14px] font-normal" />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            Catatan admin {panel.aksi === 'tolak' ? '(wajib, tampil ke penyewa)' : '(opsional)'}
            <textarea value={panel.catatan} onChange={(e) => setPanel({ ...panel, catatan: e.target.value })}
              rows={3} maxLength={500}
              className="rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[14px] font-normal"
              placeholder={panel.aksi === 'setujui' ? 'Mis. disetujui penuh; refund dikirim hari ini.' : 'Mis. jadwal masih 2 jam lagi — sesuai kebijakan tidak dapat dibatalkan.'} />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={putuskan} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full bg-brand px-5 text-[13px] font-bold text-white disabled:opacity-60">
              {kirim ? 'Menyimpan…' : panel.aksi === 'setujui' ? 'Ya, setujui pembatalan' : 'Ya, tolak pengajuan'}
            </button>
            <button type="button" onClick={() => setPanel(null)} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[13px] font-bold">
              Batal
            </button>
          </div>
        </div>
      )}

      {baris.length === 0 ? (
        <Tabel ariaLabel="Antrean pengajuan pembatalan" head={['Kode']} kosong="Antrean kosong — semua pengajuan sudah diputuskan." />
      ) : (
        <Tabel ariaLabel="Antrean pengajuan pembatalan" head={['Kode', 'Penyewa', 'Alasan', 'Jadwal main', 'Rekening refund', 'Aksi']}>
          {baris.map((b) => (
            <tr key={b.kode} className="border-b border-line last:border-b-0 hover:bg-mist/60">
              <Td strong>{b.kode}</Td>
              <Td>{b.penyewa}<br /><span className="text-[13px] text-muted">{b.kontak}</span></Td>
              <Td>{b.alasan}</Td>
              <Td>{labelPanjang(b.tanggal)}<br />
                <span className="text-[13px] text-muted">
                  {String(b.jamMulai).padStart(2, '0')}.00–{String(b.jamSelesai).padStart(2, '0')}.00 · {formatRupiah(b.totalHarga)}
                </span></Td>
              <Td>
                <span className="font-bold">{b.namaBank}</span> {b.nomorRekening}<br />
                <span className="text-[13px] text-muted">a.n. {b.atasNama} · diajukan {labelDibuat(b.diajukanPada)}</span>
              </Td>
              <Td kanan>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => buka(b, 'setujui')} aria-label={`Setujui batal ${b.kode}`}
                    className="btn inline-flex h-10 cursor-pointer items-center rounded-full bg-brand px-4 text-[13px] font-bold text-white">
                    Setujui
                  </button>
                  <button type="button" onClick={() => buka(b, 'tolak')} aria-label={`Tolak batal ${b.kode}`}
                    className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold">
                    Tolak
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </Tabel>
      )}
      <Catatan>
        Selama pengajuan diproses slot tetap terisi. Menyetujui mengubah status menjadi <strong>Dibatalkan</strong>,
        melepas slot, dan membuat refund (gateway bila pembayaran lewat gateway, manual bila tidak). Menolak mengembalikan
        status ke <strong>Terkonfirmasi</strong> dan wajib disertai catatan.
      </Catatan>
    </div>
  );
}
