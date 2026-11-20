import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import { Icon } from '@/components/icons';
import { BadgeStatus, STATUS_PESANAN } from '@/components/status-pesanan';
import type { DetailPesananAdmin } from '@/lib/admin/pesanan/data';
import { formatRupiah, labelDibuat, labelPanjang } from '@/lib/format';
import { SinkronPembayaran } from './SinkronPembayaran';

const STATUS_BAYAR: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pending', bg: '#FFF1D6', fg: '#7A4B00' },
  dibayar: { label: 'Dibayar', bg: '#DDF7E8', fg: '#0A6B3A' },
  gagal: { label: 'Gagal', bg: '#FDE4E5', fg: '#B42328' },
  kedaluwarsa: { label: 'Kedaluwarsa', bg: '#E3EAE6', fg: '#4F6358' },
  refund: { label: 'Refund', bg: '#E6FBF7', fg: '#0B5E52' },
  sebagian_refund: { label: 'Refund sebagian', bg: '#E6FBF7', fg: '#0B5E52' },
  perlu_tinjau: { label: 'Perlu tinjau', bg: '#FDE4E5', fg: '#B42328' },
};

const KEADAAN_BATAL: Record<'menunggu' | 'disetujui' | 'ditolak', string> = {
  menunggu: 'Menunggu keputusan admin',
  disetujui: 'Disetujui — pesanan dibatalkan',
  ditolak: 'Ditolak — pesanan tetap berlaku',
};

/** Detail pesanan versi admin (FR-ADM-08): penyewa, slot, seluruh percobaan gateway, refund, pengajuan batal, linimasa. */
export function DetailPesananAdminView({ pesanan: p }: { pesanan: DetailPesananAdmin }) {
  const rentang = `${String(p.jamMulai).padStart(2, '0')}.00–${String(p.jamSelesai).padStart(2, '0')}.00`;

  return (
    <AdminShell aktif="Pesanan" judul={`Pesanan ${p.kode}`}
      keterangan="Rincian lengkap satu pesanan: identitas penyewa, slot, transaksi gateway, refund, dan putusan pembatalan.">
      <Link href="/admin/pesanan" className="text-[15px] font-bold text-muted no-underline hover:text-ink">← Kembali ke daftar pesanan</Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 font-display text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.1] tracking-[-0.03em]">
          <span className="text-brand-2">{p.kode}</span>
        </h1>
        <BadgeStatus status={p.status} />
      </div>

      {/* Rincian */}
      <section aria-label="Rincian pesanan" className="mt-6 rounded-[28px] border-[1.5px] border-line bg-white p-7">
        <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Penyewa</dt>
            <dd className="mt-1 font-semibold">{p.penyewa}<br /><span className="text-[13px] font-medium text-muted">{p.email}</span></dd></div>
          <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Lapangan</dt>
            <dd className="mt-1 font-display text-lg font-bold">{p.lapanganNama}</dd></div>
          <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Jadwal main</dt>
            <dd className="mt-1 font-semibold">{labelPanjang(p.tanggal)} · {rentang}</dd></div>
          <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Total (terkunci — BR-06)</dt>
            <dd className="mt-1 font-display text-lg font-bold text-brand">{formatRupiah(p.totalHarga)}</dd></div>
          <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Dibuat</dt>
            <dd className="mt-1 text-muted">{labelDibuat(p.dibuatPada)}</dd></div>
          {p.batasBayarPada && (
            <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Batas pembayaran</dt>
              <dd className="mt-1 font-bold text-[#7A4B00]">{labelDibuat(p.batasBayarPada)}</dd></div>
          )}
        </dl>
        {p.status === 'ditolak' && p.alasanPenolakan && (
          <div className="mt-5"><Banner nada="merah" ikon="alert">Bukti ditolak (final — BR-11): {p.alasanPenolakan}</Banner></div>
        )}
      </section>

      {/* Pengajuan pembatalan */}
      {p.pengajuanBatal && (
        <section aria-label="Pengajuan pembatalan" className="mt-6 rounded-[28px] border-[1.5px] border-line bg-mist p-7">
          <h2 className="m-0 flex items-center gap-2.5 font-display text-xl font-bold">
            <Icon name="cancel" size={20} stroke="#B42328" width={2.4} />Pengajuan pembatalan
          </h2>
          <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Keadaan</dt>
              <dd className="mt-1 font-bold">{KEADAAN_BATAL[p.pengajuanBatal.keadaan]}</dd></div>
            <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Kontak</dt>
              <dd className="mt-1 font-semibold">{p.pengajuanBatal.kontak}</dd></div>
            <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Rekening refund</dt>
              <dd className="mt-1 font-semibold">{p.pengajuanBatal.namaBank} {p.pengajuanBatal.nomorRekening} a.n. {p.pengajuanBatal.atasNama}</dd></div>
            <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Diajukan</dt>
              <dd className="mt-1 text-muted">{labelDibuat(p.pengajuanBatal.diajukanPada)}</dd></div>
            {p.pengajuanBatal.nominalRefund !== null && (
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Nominal refund diputuskan</dt>
                <dd className="mt-1 font-bold text-brand">{formatRupiah(p.pengajuanBatal.nominalRefund)}</dd></div>
            )}
            {p.pengajuanBatal.diputuskanPada && (
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Diputuskan</dt>
                <dd className="mt-1 text-muted">{labelDibuat(p.pengajuanBatal.diputuskanPada)}</dd></div>
            )}
          </dl>
          <p className="mt-4 mb-0"><b>Alasan penyewa:</b> {p.pengajuanBatal.alasan}</p>
          {p.pengajuanBatal.catatanAdmin && <p className="mt-1 mb-0"><b>Catatan admin:</b> {p.pengajuanBatal.catatanAdmin}</p>}
        </section>
      )}

      {/* Slot pesanan */}
      <section aria-label="Slot pesanan" className="mt-6 rounded-[28px] border-[1.5px] border-line bg-white p-7">
        <h2 className="m-0 font-display text-xl font-bold">Slot</h2>
        {p.slot.length === 0 ? (
          <p className="mt-3 mb-0 text-muted">Tidak ada slot aktif — semua slot sudah dilepas (dibatalkan/kedaluwarsa).</p>
        ) : (
          <ul className="mt-4 mb-0 flex list-none flex-wrap gap-2.5 p-0">
            {p.slot.map((s) => (
              <li key={s.jam} className="rounded-full bg-mist px-4 py-2 text-[14px] font-bold">
                {String(s.jam).padStart(2, '0')}.00–{String(s.jam + 1).padStart(2, '0')}.00 · {formatRupiah(s.hargaPerJam)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Transaksi gateway */}
      <section aria-label="Transaksi pembayaran gateway" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-display text-xl font-bold">Transaksi pembayaran gateway</h2>
          {p.pembayaranGateway.length > 0 && <SinkronPembayaran kode={p.kode} />}
        </div>
        <div className="mt-4">
          {p.pembayaranGateway.length === 0 ? (
            <Tabel ariaLabel="Transaksi gateway" head={['Order ID']} kosong="Pesanan ini tidak memiliki transaksi gateway (mis. dibayar lewat bukti transfer)." />
          ) : (
            <Tabel ariaLabel="Transaksi gateway" head={['Order ID', 'Provider', 'Status', 'Jumlah', 'Metode', 'Waktu']}>
              {p.pembayaranGateway.map((t) => {
                const b = STATUS_BAYAR[t.status] ?? { label: t.status, bg: '#E3EAE6', fg: '#4F6358' };
                return (
                  <tr key={t.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                    <Td strong>{t.orderId}</Td>
                    <Td>{t.provider}</Td>
                    <Td>
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[13px] font-bold" style={{ backgroundColor: b.bg, color: b.fg }}>
                        {b.label}
                      </span>
                      {t.perluTinjau && t.alasanTinjau && (
                        <span className="mt-1 block text-[12px] font-bold text-[#B42328]">{t.alasanTinjau}</span>
                      )}
                    </Td>
                    <Td strong>{formatRupiah(t.jumlah)}</Td>
                    <Td>{t.metode ?? '—'}</Td>
                    <Td>
                      <span className="text-[13px] text-muted">dibuat {labelDibuat(t.dibuatPada)}</span><br />
                      {t.dibayarPada && <span className="text-[13px] text-muted">dibayar {labelDibuat(t.dibayarPada)}</span>}
                      {t.kedaluwarsaPada && <span className="block text-[13px] text-muted">kedaluwarsa {labelDibuat(t.kedaluwarsaPada)}</span>}
                    </Td>
                  </tr>
                );
              })}
            </Tabel>
          )}
        </div>
      </section>

      {/* Refund */}
      <section aria-label="Refund pesanan" className="mt-6">
        <h2 className="m-0 font-display text-xl font-bold">Refund</h2>
        <div className="mt-4">
          {p.refund.length === 0 ? (
            <Tabel ariaLabel="Refund" head={['Nominal']} kosong="Belum ada refund untuk pesanan ini." />
          ) : (
            <Tabel ariaLabel="Refund" head={['Nominal', 'Alasan', 'Cara & status', 'Catatan']}>
              {p.refund.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                  <Td strong>{formatRupiah(r.nominal)}</Td>
                  <Td>{r.alasan}</Td>
                  <Td>
                    <span className="font-bold">{r.cara === 'gateway' ? 'Gateway' : 'Manual'}</span>
                    <span className="block text-[13px] text-muted">
                      {r.status}
                      {r.referenceGateway && ` · ${r.referenceGateway}`}
                      {r.selesaiPada && ` · selesai ${labelDibuat(r.selesaiPada)}`}
                    </span>
                  </Td>
                  <Td>{r.catatan ?? '—'}</Td>
                </tr>
              ))}
            </Tabel>
          )}
        </div>
      </section>

      {/* Linimasa */}
      <section aria-label="Linimasa status" className="mt-6 rounded-[28px] border-[1.5px] border-line bg-white p-7">
        <h2 className="m-0 font-display text-xl font-bold">Linimasa status</h2>
        <ol className="m-0 mt-5 flex list-none flex-col gap-0 p-0">
          {p.riwayat.map((e, i) => {
            const st = STATUS_PESANAN[e.statusBaru];
            const terakhir = i === p.riwayat.length - 1;
            return (
              <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                {!terakhir && <span aria-hidden="true" className="absolute left-[9px] top-6 h-[calc(100%-16px)] w-[2px] bg-line" />}
                <span aria-hidden="true" className="mt-1 size-5 shrink-0 rounded-full border-[3px]" style={{ borderColor: st.fg, background: st.bg }} />
                <div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold" style={{ color: st.fg }}>{st.label}</span>
                    <span className="text-[13px] text-muted">{labelDibuat(e.waktu)} · oleh {e.oleh}</span>
                  </div>
                  {e.catatan && <p className="m-0 mt-1 text-[15px] text-muted">{e.catatan}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <Catatan>
        Semua keputusan atas pembayaran bermasalah dan pengajuan pembatalan diambil di menu <b>Pembayaran</b>;
        halaman ini hanya menampilkan keadaan terkini.
      </Catatan>
    </AdminShell>
  );
}
