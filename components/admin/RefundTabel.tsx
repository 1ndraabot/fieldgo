'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { BarisRefund } from '@/lib/admin/pengecualian/data';
import { formatRupiah, labelDibuat } from '@/lib/format';
import { kirimApi } from './api';

const STATUS_BADGE: Record<BarisRefund['status'], { bg: string; fg: string; label: string }> = {
  menunggu: { bg: '#FFF1D6', fg: '#7A4B00', label: 'Menunggu' },
  diproses: { bg: '#E3EAE6', fg: '#0B5E52', label: 'Diproses gateway' },
  berhasil: { bg: '#DDF7E8', fg: '#0A6B3A', label: 'Berhasil' },
  gagal: { bg: '#FDE4E5', fg: '#B42328', label: 'Gagal' },
};

type Panel = { baris: BarisRefund; catatan: string } | null;

/** Pantau refund berjalan (FR-ADM-07): tandai transfer manual selesai; refund gateway mengikuti webhook. */
export function RefundTabel({ baris }: { baris: BarisRefund[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [pesan, setPesan] = useState<{ nada: 'merah' | 'teal'; teks: string } | null>(null);
  const [kirim, setKirim] = useState(false);

  async function tandaiSelesai() {
    if (!panel) return;
    setKirim(true);
    setPesan(null);
    const h = await kirimApi(`/api/admin/refund/${panel.baris.kode}/selesaikan`, 'POST', {
      refundId: panel.baris.id, catatan: panel.catatan,
    });
    setKirim(false);
    const b = panel.baris;
    setPanel(null);
    if (!h.ok) {
      setPesan({ nada: 'merah', teks: h.pesan ?? 'Refund gagal ditandai selesai.' });
      return;
    }
    setPesan({ nada: 'teal', teks: `Refund ${formatRupiah(b.nominal)} untuk ${b.kode} ditandai selesai — sudah ditransfer manual.` });
    router.refresh();
  }

  return (
    <div>
      {pesan && <div className="mb-4"><Banner nada={pesan.nada} ikon={pesan.nada === 'teal' ? 'check' : 'alert'} role="status">{pesan.teks}</Banner></div>}

      {panel && (
        <div className="mb-4 flex flex-col gap-3 rounded-[22px] border-[1.5px] border-[#E0A800] bg-[#FFF8E1] p-5">
          <div className="text-sm font-semibold">
            Tandai refund <b>{formatRupiah(panel.baris.nominal)}</b> untuk pesanan {panel.baris.kode} sudah ditransfer?
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            Catatan transfer (wajib, mis. tanggal + kanal)
            <textarea value={panel.catatan} onChange={(e) => setPanel({ ...panel, catatan: e.target.value })}
              rows={2} maxLength={500}
              className="rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[14px] font-normal"
              placeholder="Mis. Transfer BCA 20/11, bukti tersimpan." />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={tandaiSelesai} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full bg-brand px-5 text-[13px] font-bold text-white disabled:opacity-60">
              {kirim ? 'Menyimpan…' : 'Ya, tandai selesai'}
            </button>
            <button type="button" onClick={() => setPanel(null)} disabled={kirim}
              className="btn h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-white px-5 text-[13px] font-bold">
              Batal
            </button>
          </div>
        </div>
      )}

      {baris.length === 0 ? (
        <Tabel ariaLabel="Daftar refund berjalan" head={['Kode']} kosong="Tidak ada refund yang sedang berjalan." />
      ) : (
        <Tabel ariaLabel="Daftar refund berjalan" head={['Kode', 'Penyewa', 'Nominal', 'Alasan', 'Cara & status', 'Aksi']}>
          {baris.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                <Td strong>{r.kode}</Td>
                <Td>{r.penyewa}</Td>
                <Td strong>{formatRupiah(r.nominal)}</Td>
                <Td>{r.alasan}</Td>
                <Td>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                    {badge.label}
                  </span>
                  <span className="mt-1 block text-[12px] font-medium text-muted">
                    {r.cara === 'gateway' ? `via gateway${r.referenceGateway ? ` · ${r.referenceGateway}` : ''}` : 'transfer manual'}
                    {r.diputuskanPada && ` · diputuskan ${labelDibuat(r.diputuskanPada)}`}
                  </span>
                  {r.catatan && <span className="mt-0.5 block text-[12px] text-muted">{r.catatan}</span>}
                </Td>
                <Td kanan>
                  {(r.status === 'menunggu' || r.status === 'gagal') && (
                    <button type="button" onClick={() => { setPanel({ baris: r, catatan: '' }); setPesan(null); }}
                      aria-label={`Tandai refund ${r.kode} selesai`}
                      className="btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] border-ink bg-white px-4 text-[13px] font-bold">
                      Tandai selesai
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </Tabel>
      )}
      <Catatan>
        Refund <strong>via gateway</strong> berstatus Diproses sampai webhook provider mengonfirmasi; bila gagal, selesaikan
        lewat transfer manual lalu tandai di sini. Refund <strong>manual</strong> (pesanan tanpa transaksi gateway) menunggu
        transfer admin — tandai selesai setelah bukti transfer tersimpan.
      </Catatan>
    </div>
  );
}
