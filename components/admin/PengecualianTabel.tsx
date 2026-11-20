'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { BarisPengecualian } from '@/lib/admin/pengecualian/data';
import { bolehTerima, labelHasilSinkron } from '@/lib/admin/pengecualian/rules';
import { formatRupiah, labelDibuat, labelPanjang } from '@/lib/format';
import { kirimApi } from './api';

const LABEL_ALASAN: Record<string, string> = {
  BAYAR_TERLAMBAT: 'Bayar terlambat',
  NOMINAL_TIDAK_COCOK: 'Nominal tidak cocok',
  STATUS_PESANAN_BERUBAH: 'Status pesanan berubah',
  PERLU_TINJAU_PROVIDER: 'Perlu tinjau provider',
  TRANSAKSI_PENDING_LEWAT_BATAS: 'Transaksi pending lewat batas',
};

type Panel = { baris: BarisPengecualian; aksi: 'terima' | 'refund'; catatan: string } | null;

/** Antrean pengecualian pembayaran (FR-ADM-06): terima (telat/status berubah) atau refund; sinkron status gateway. */
export function PengecualianTabel({ baris }: { baris: BarisPengecualian[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  async function putuskan() {
    if (!panel) return;
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/pembayaran/${panel.baris.kode}/tinjau`, 'POST', {
      aksi: panel.aksi, catatan: panel.catatan,
    });
    setKirim(false);
    if (!h.ok) {
      // Slot sudah dipesan orang lain: satu-satunya jalan adalah refund penuh — buka formnya langsung.
      if (h.kode === 'SLOT_TERPAKAI') {
        setPanel({ ...panel, aksi: 'refund', catatan: 'Slot sudah dipesan penyewa lain — refund penuh pembayaran.' });
        setPesan({ nada: 'merah', teks: `${h.pesan ?? 'Slot sudah terpakai.'} Form refund penuh dibuka di bawah — cukup konfirmasi.` });
        return;
      }
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Keputusan gagal disimpan.' });
      setPanel(null);
      return;
    }
    const kode = panel.baris.kode;
    setPanel(null);
    setPesan({
      nada: 'teal',
      teks: panel.aksi === 'terima'
        ? `Pembayaran ${kode} diterima — pesanan kini Terkonfirmasi dan slot terkunci.`
        : `Refund pembayaran ${kode} dibuat. Bila jalur gateway gagal, selesaikan transfer manual di tab Refund.`,
    });
    router.refresh();
  }

  async function sinkronkan(kode: string) {
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/pembayaran/${kode}/sinkron`, 'POST');
    setKirim(false);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Sinkronisasi gagal.' });
      return;
    }
    setPesan({ nada: 'teal', teks: labelHasilSinkron(String(h.data ?? '')) });
    router.refresh();
  }

  return (
    <div>
      {pesan && <div className="mb-4"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

      {panel && (
        <div className="mb-4 flex flex-col gap-3 rounded-[22px] border-[1.5px] border-[#E0A800] bg-[#FFF8E1] p-5">
          <div className="text-sm font-semibold">
            {panel.aksi === 'terima' ? 'Terima' : 'Refund'} pembayaran <b>{panel.baris.orderId}</b> ({formatRupiah(panel.baris.jumlah)})
            {' '}untuk pesanan {panel.baris.kode}?
          </div>
          <p className="m-0 text-[13px] leading-relaxed text-muted">
            {panel.aksi === 'terima'
              ? 'Pesanan menjadi Terkonfirmasi dan slot dikunci ulang. Terima hanya untuk bayar terlambat atau status pesanan yang berubah.'
              : 'Uang dikembalikan lewat gateway. Bila gateway menolak, refund jatuh ke jalur manual dan tampil di tab Refund.'}
          </p>
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            Catatan admin {panel.aksi === 'refund' ? '(alasan refund, wajib)' : '(opsional)'}
            <textarea value={panel.catatan} onChange={(e) => setPanel({ ...panel, catatan: e.target.value })}
              rows={3} maxLength={500}
              className="rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[14px] font-normal"
              placeholder={panel.aksi === 'refund' ? 'Mis. nominal tidak sesuai tagihan; refund penuh.' : 'Mis. terlambat 1 jam karena gangguan jaringan.'} />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={putuskan} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full bg-brand px-5 text-[13px] font-bold text-white disabled:opacity-60">
              {kirim ? 'Menyimpan…' : panel.aksi === 'terima' ? 'Ya, terima pembayaran' : 'Ya, buat refund'}
            </button>
            <button type="button" onClick={() => setPanel(null)} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[13px] font-bold">
              Batal
            </button>
          </div>
        </div>
      )}

      {baris.length === 0 ? (
        <Tabel ariaLabel="Antrean pengecualian pembayaran" head={['Kode']} kosong="Antrean kosong — tidak ada pembayaran yang bermasalah." />
      ) : (
        <Tabel ariaLabel="Antrean pengecualian pembayaran" head={['Kode', 'Penyewa', 'Lapangan', 'Jadwal main', 'Jumlah', 'Masalah', 'Aksi']}>
          {baris.map((b) => {
            const bisaTerima = bolehTerima(b.alasan);
            return (
              <tr key={b.orderId} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                <Td strong>{b.orderId}<br /><span className="text-[12px] text-muted">pesanan {b.kode}</span></Td>
                <Td>{b.penyewa}</Td>
                <Td strong>{b.lapanganNama}</Td>
                <Td>{labelPanjang(b.tanggal)}<br />
                  <span className="text-[13px] text-muted">{String(b.jamMulai).padStart(2, '0')}.00–{String(b.jamSelesai).padStart(2, '0')}.00</span></Td>
                <Td strong>{formatRupiah(b.jumlah)}
                  {b.metode && <span className="mt-0.5 block text-[12px] font-medium text-muted">{b.metode}</span>}
                  {b.dibayarPada && <span className="block text-[12px] font-medium text-muted">dibayar {labelDibuat(b.dibayarPada)}</span>}
                  {b.jenis === 'pending' && <span className="block text-[12px] font-medium text-muted">belum ada pembayaran</span>}
                </Td>
                <Td>
                  <span className="inline-flex items-center rounded-full bg-[#FFF1D6] px-3 py-1 text-[13px] font-bold text-[#7A4B00]">
                    {LABEL_ALASAN[b.alasan] ?? b.alasan}
                  </span>
                </Td>
                <Td kanan>
                  <div className="flex justify-end gap-2">
                    {b.jenis === 'tinjau' && bisaTerima && (
                      <button type="button" onClick={() => { setPanel({ baris: b, aksi: 'terima', catatan: '' }); setPesan(null); }}
                        aria-label={`Terima pembayaran ${b.kode}`}
                        className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold">
                        Terima
                      </button>
                    )}
                    {b.jenis === 'tinjau' && (
                      <button type="button" onClick={() => { setPanel({ baris: b, aksi: 'refund', catatan: '' }); setPesan(null); }}
                        aria-label={`Refund pembayaran ${b.kode}`}
                        className="btn inline-flex h-10 cursor-pointer items-center rounded-full bg-brand px-4 text-[13px] font-bold text-white">
                        Refund
                      </button>
                    )}
                    <button type="button" onClick={() => sinkronkan(b.kode)} disabled={kirim}
                      aria-label={`Sinkronkan status ${b.kode}`}
                      className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold disabled:opacity-60">
                      Sinkronkan
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Tabel>
      )}
      <Catatan>
        <strong>Terima</strong> hanya untuk uang yang sudah masuk dengan nominal benar tetapi kedaluwarsa slot (bayar telat)
        atau status pesanan sempat berubah. Nominal tidak cocok atau permintaan tinjau dari provider <strong>wajib di-refund</strong>.
        Sinkronkan menarik status terbaru dari gateway dan memprosesnya sama seperti webhook.
      </Catatan>
    </div>
  );
}
