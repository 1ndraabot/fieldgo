import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, PilFilter, Tabel, Td, TombolAksi } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { AntrianBatal, AntrianBukti } from '@/lib/demo-fe';
import { formatRupiah, labelDibuat, labelPanjang } from '@/lib/format';

const rentang = (b: { jamMulai: number; jamSelesai: number }) =>
  `${String(b.jamMulai).padStart(2, '0')}.00–${String(b.jamSelesai).padStart(2, '0')}.00`;

/** Antrian verifikasi: bukti transfer (FR-ADM-06) dan pengajuan pembatalan + refund (FR-ADM-07), dipilah via ?tab=. */
export function VerifikasiView({ tab, bukti, pembatalan }: { tab: 'bukti' | 'batal'; bukti: AntrianBukti[]; pembatalan: AntrianBatal[] }) {
  const usang = bukti.filter((b) => new Date().getTime() - b.diunggahPada.getTime() > 12 * 3600_000).length;
  return (
    <AdminShell aktif="Verifikasi" judul="Verifikasi"
      keterangan="Periksa bukti transfer dan putuskan pengajuan pembatalan. Keputusan langsung mengubah status pesanan penyewa (PRD 8.5).">
      <PilFilter namaParam="tab" basis="/admin/verifikasi" aktif={tab}
        daftar={[
          { nilai: 'bukti', label: `Bukti transfer (${bukti.length})` },
          { nilai: 'batal', label: `Pengajuan batal (${pembatalan.length})` },
        ]} />

      {tab === 'bukti' && (
        <div className="mt-6">
          {usang > 0 && (
            <div className="mb-5">
              <Banner nada="amber" ikon="alert">
                {usang} bukti diajukan lebih dari 12 jam lalu — prioritaskan agar penyewa tidak menunggu terlalu lama (BR-09).
              </Banner>
            </div>
          )}
          {bukti.length === 0 ? (
            <Tabel ariaLabel="Antrian bukti transfer" head={['Kode']} kosong="Antrian kosong — semua bukti sudah diverifikasi." />
          ) : (
            <Tabel ariaLabel="Antrian bukti transfer" head={['Kode', 'Penyewa', 'Lapangan', 'Jadwal main', 'Total', 'Bukti', 'Aksi']}>
              {bukti.map((b) => (
                <tr key={b.kode} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                  <Td strong>{b.kode}</Td>
                  <Td>{b.penyewa}</Td>
                  <Td strong>{b.lapanganNama}</Td>
                  <Td>{labelPanjang(b.tanggal)}<br /><span className="text-[13px] text-muted">{rentang(b)}</span></Td>
                  <Td strong>{formatRupiah(b.total)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1 text-[13px] font-bold">
                      {b.jenisBukti} · {labelDibuat(b.diunggahPada)}
                    </span>
                  </Td>
                  <Td kanan>
                    <div className="flex justify-end gap-2">
                      <TombolAksi label={`Lihat bukti ${b.kode} (backend menyusul)`}>Lihat bukti</TombolAksi>
                      <TombolAksi utama label={`Setujui ${b.kode} (backend menyusul)`}>Setujui</TombolAksi>
                      <TombolAksi label={`Tolak ${b.kode} (backend menyusul)`}>Tolak</TombolAksi>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tabel>
          )}
          <Catatan>
            Menyetujui bukti mengubah status menjadi <strong>Terkonfirmasi</strong> dan slot terkunci. Menolak bersifat final (BR-11) —
            wajib menulis alasan yang jelas; alasan tampil di detail pesanan penyewa (FR-HIS-05).
          </Catatan>
        </div>
      )}

      {tab === 'batal' && (
        <div className="mt-6">
          {pembatalan.length === 0 ? (
            <Tabel ariaLabel="Antrian pengajuan pembatalan" head={['Kode']} kosong="Antrian kosong — semua pengajuan sudah diputuskan." />
          ) : (
            <Tabel ariaLabel="Antrian pengajuan pembatalan" head={['Kode', 'Penyewa', 'Alasan', 'Rekening refund', 'Aksi']}>
              {pembatalan.map((b) => (
                <tr key={b.kode} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                  <Td strong>
                    <Link href={`/riwayat/${b.kode}`} className="font-display font-bold text-ink underline hover:text-brand">{b.kode}</Link>
                  </Td>
                  <Td>{b.penyewa}<br /><span className="text-[13px] text-muted">{b.kontak}</span></Td>
                  <Td>{b.alasan}</Td>
                  <Td>
                    <span className="font-bold">{b.namaBank}</span> {b.nomorRekening}<br />
                    <span className="text-[13px] text-muted">a.n. {b.atasNama} · diajukan {labelDibuat(b.diajukanPada)}</span>
                  </Td>
                  <Td kanan>
                    <div className="flex justify-end gap-2">
                      <TombolAksi utama label={`Setujui batal ${b.kode} (backend menyusul)`}>Setujui batal</TombolAksi>
                      <TombolAksi label={`Tolak ${b.kode} (backend menyusul)`}>Tolak</TombolAksi>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tabel>
          )}
          <Catatan>
            Selama pengajuan diproses, slot tetap terisi (FR-CAN-03). Menyetujui batal mengubah status menjadi
            <strong> Dibatalkan</strong> dan mencatat nominal refund di catatan admin (BR-13); slot langsung dapat dipesan ulang.
          </Catatan>
        </div>
      )}
    </AdminShell>
  );
}
