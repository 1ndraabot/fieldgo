import Link from 'next/link';
import { Banner } from '@/components/auth/ui';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Icon } from '@/components/icons';
import { BadgeStatus, STATUS_PESANAN } from '@/components/status-pesanan';
import type { DetailPesanan } from '@/lib/demo-fe';
import { formatRupiah, labelDibuat, labelPanjang } from '@/lib/format';

const pad = 'px-[clamp(16px,4.5vw,64px)]';
const rentang = (b: { jamMulai: number; jamSelesai: number }) =>
  `${String(b.jamMulai).padStart(2, '0')}.00–${String(b.jamSelesai).padStart(2, '0')}.00`;

/** Detail pesanan: rincian, linimasa status, bukti, alasan penolakan, dan tombol aksi kontekstual (FR-HIS-03/04). */
export function PesananDetailView({ pengguna, data, bisaAjukanBatal }: {
  pengguna: { nama: string }; data: DetailPesanan; bisaAjukanBatal: boolean;
}) {
  const { kode } = data;
  const aksi: { href: string; label: string; utama?: boolean; aria?: string }[] = [];
  if (data.status === 'menunggu_pembayaran') {
    aksi.push({ href: `/pesanan/${kode}/bayar`, label: 'Bayar / unggah bukti', utama: true });
    aksi.push({ href: `/pesanan/${kode}/bayar`, label: 'Batalkan pesanan', aria: 'Batalkan melalui halaman pembayaran (BR-10, tanpa form)' });
  }
  if (data.status === 'terkonfirmasi' && bisaAjukanBatal) {
    aksi.push({ href: `/riwayat/${kode}/batal`, label: 'Ajukan pembatalan', utama: true });
  }
  if (data.status === 'ditolak' || data.status === 'kedaluwarsa' || data.status === 'dibatalkan') {
    aksi.push({ href: `/lapangan/${data.lapanganId}`, label: 'Pesan ulang', utama: true, aria: 'Slot tidak dijamin kosong; pilih ulang (FR-HIS-05)' });
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] overflow-x-clip bg-white">
      <Header pengguna={pengguna} aktif="Riwayat" />
      <main className={`relative ${pad} pb-28 pt-10`}>
        <div aria-hidden="true" className="absolute left-[-120px] top-[-40px] size-[380px] rounded-full bg-mint opacity-90 blur-[90px]" />
        <div className="relative z-[1] mx-auto max-w-[1080px]">
          <Link href="/riwayat" className="text-[15px] font-bold text-muted no-underline">← Kembali ke riwayat</Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-[clamp(32px,4.4vw,48px)] font-bold leading-[1.1] tracking-[-0.04em]">Pesanan <span className="text-brand-2">{data.kode}</span></h1>
            <BadgeStatus status={data.status} />
          </div>

          {/* Rincian */}
          <section aria-label="Rincian pesanan" className="mt-8 rounded-[32px] border-[1.5px] border-line bg-white p-7">
            <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Lapangan</dt><dd className="mt-1 font-display text-xl font-bold">{data.lapanganNama}</dd></div>
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Total (terkunci saat dibuat — BR-06)</dt><dd className="mt-1 font-display text-xl font-bold text-brand">{formatRupiah(data.totalHarga)}</dd></div>
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Tanggal main</dt><dd className="mt-1 font-semibold">{labelPanjang(data.tanggal)}</dd></div>
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Jam main</dt><dd className="mt-1 font-semibold">{rentang(data)} · {data.jumlahJam} jam</dd></div>
              <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Dibuat</dt><dd className="mt-1 text-muted">{labelDibuat(data.dibuatPada)}</dd></div>
              {data.status === 'menunggu_pembayaran' && data.batasBayarPada && (
                <div><dt className="text-[13px] font-bold uppercase tracking-wider text-muted">Batas unggah bukti (BR-07)</dt><dd className="mt-1 font-bold text-[#7A4B00]">{labelDibuat(data.batasBayarPada)}</dd></div>
              )}
            </dl>
          </section>

          {/* Keadaan khusus */}
          {data.status === 'ditolak' && data.alasanPenolakan && (
            <div className="mt-5"><Banner nada="merah" ikon="alert">Bukti ditolak (final — BR-11): {data.alasanPenolakan} Pesan ulang dengan slot baru.</Banner></div>
          )}
          {data.status === 'terkonfirmasi' && !bisaAjukanBatal && (
            <div className="mt-5"><Banner nada="amber" ikon="info" role="status">Batas pembatalan telah terlewati (H-1). Pesanan ini berlaku seperti biasa (FR-CAN-01).</Banner></div>
          )}
          {data.pengajuanBatal && (
            <div className="mt-5"><Banner nada="amber" ikon="info" role="status">
              Pengajuan pembatalan <strong>{data.pengajuanBatal.keadaan === 'menunggu' ? 'menunggu keputusan admin' : data.pengajuanBatal.keadaan}</strong>. Alasan: {data.pengajuanBatal.alasan}
              {data.pengajuanBatal.catatanAdmin && <> · Catatan admin: {data.pengajuanBatal.catatanAdmin}</>} · Slot tetap terisi sampai diputuskan (FR-CAN-03).
            </Banner></div>
          )}

          {/* Aksi kontekstual */}
          {aksi.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              {aksi.map((a) => a.utama ? (
                <Link key={a.label} href={a.href} aria-label={a.aria ?? a.label}
                  className="btn flex h-14 items-center rounded-full bg-brand px-7 text-base font-bold text-white no-underline">{a.label}</Link>
              ) : (
                <Link key={a.label} href={a.href} aria-label={a.aria ?? a.label}
                  className="btn flex h-14 items-center rounded-full border-[1.5px] border-ink bg-white px-7 text-base font-bold no-underline">{a.label}</Link>
              ))}
            </div>
          )}

          {/* Bukti transfer */}
          <section aria-label="Bukti transfer" className="mt-8 rounded-[32px] border-[1.5px] border-line bg-mist p-7">
            <h2 className="flex items-center gap-2.5 font-display text-xl font-bold"><Icon name="upload" size={20} stroke="#0E8A4A" width={2.4} />Bukti transfer</h2>
            {data.bukti ? (
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold">
                  <Icon name="card" size={16} stroke="#0E8A4A" width={2.4} />{data.bukti.namaBerkas}
                </span>
                <span className="text-sm text-muted">Diunggah {labelDibuat(data.bukti.diunggahPada)}</span>
              </div>
            ) : (
              <p className="mt-3 text-muted">Belum ada bukti diunggah.</p>
            )}
            <p className="mt-3 text-[13px] text-muted">Bukti tersimpan privat — hanya pemilik pesanan dan admin yang dapat melihat (PRD 10.1).</p>
          </section>

          {/* Linimasa */}
          <section aria-label="Linimasa status" className="mt-8 rounded-[32px] border-[1.5px] border-line bg-white p-7">
            <h2 className="font-display text-xl font-bold">Linimasa status</h2>
            <ol className="m-0 mt-5 flex list-none flex-col gap-0 p-0">
              {data.riwayat.map((e, i) => {
                const st = STATUS_PESANAN[e.statusBaru];
                const terakhir = i === data.riwayat.length - 1;
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
        </div>
      </main>
      <Footer olahragaList={['Futsal', 'Badminton', 'Basket', 'Tenis', 'Mini Soccer']} />
    </div>
  );
}
