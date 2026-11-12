import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, PilihLapangan, Tabel, Td, TombolAksi } from '@/components/admin/ui';
import type { BarisJamOperasional } from '@/lib/demo-fe';
import { formatJam } from '@/lib/format';

const HARI_NAMA = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/** Kelola jam operasional per lapangan per hari (FR-ADM-04). Standar: 06.00–24.00, buka setiap hari. */
export function JamOperasionalView({ daftar, aktifId, lapanganNama, baris }: {
  daftar: { id: number; nama: string }[]; aktifId: number; lapanganNama: string; baris: BarisJamOperasional[];
}) {
  const tutup = baris.filter((b) => !b.buka).length;
  return (
    <AdminShell aktif="Jam operasional" judul="Jam operasional"
      keterangan={`Atur jam buka dan tutup tiap hari untuk ${lapanganNama}. Jam di luar rentang ini otomatis tampil Tidak tersedia (PRD 8.2).`}
      aksi={<TombolAksi utama label="Terapkan ke semua hari (backend menyusul)">Terapkan ke semua hari</TombolAksi>}>
      <PilihLapangan daftar={daftar} aktifId={aktifId} basis="/admin/jam-operasional" />
      <div className="mt-6">
        <Tabel ariaLabel={`Jam operasional ${lapanganNama}`} head={['Hari', 'Status', 'Jam buka', 'Jam tutup', 'Aksi']}
          kosong={tutup === baris.length ? 'Lapangan ini tutup setiap hari.' : undefined}>
          {baris.map((b) => (
            <tr key={b.hari} className="border-b border-line last:border-b-0 hover:bg-mist/60">
              <Td strong>{HARI_NAMA[b.hari - 1]}</Td>
              <Td>
                {b.buka ? (
                  <span className="inline-flex items-center rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-[#0A6B3A]">Buka</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#E3EAE6] px-3 py-1 text-[13px] font-bold text-[#4F6358]">Tutup</span>
                )}
              </Td>
              <Td strong>{b.buka ? formatJam(b.jamBuka) : '—'}</Td>
              <Td strong>{b.buka ? formatJam(b.jamTutup) : '—'}</Td>
              <Td kanan><TombolAksi label={`Ubah jam ${HARI_NAMA[b.hari - 1]} (backend menyusul)`}>Ubah</TombolAksi></Td>
            </tr>
          ))}
        </Tabel>
      </div>
      <Catatan>
        Slot yang dibuka harus tertutup tarif (BR-15). Jam di luar jam operasional dan hari Tutup tidak dapat dipesan dan tampil
        <strong> Tidak tersedia</strong> pada kalender penyewa (AC-20).
      </Catatan>
    </AdminShell>
  );
}
