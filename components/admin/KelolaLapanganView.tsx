import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td, TombolAksi } from '@/components/admin/ui';
import { BadgeStatus } from '@/components/status-pesanan';
import type { BarisAdminLapangan } from '@/lib/demo-fe';
import { formatRupiah } from '@/lib/format';
import type { StatusPesanan } from '@/lib/slots';

// Badge memakai warna status; aktif = hijau, nonaktif = abu (sumber tunggal status-pesanan memakai StatusPesanan,
// jadi di sini dipakai span kecil dengan token yang sama).
function BadgeAktif({ aktif }: { aktif: boolean }) {
  return aktif ? (
    <span className="inline-flex items-center rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-[#0A6B3A]">Aktif</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-[#E3EAE6] px-3 py-1 text-[13px] font-bold text-[#4F6358]">Nonaktif</span>
  );
}

/** Kelola lapangan: daftar + status aktif/nonaktif, tanpa hapus fisik (FR-ADM-02, BR-17). */
export function KelolaLapanganView({ daftar }: { daftar: BarisAdminLapangan[] }) {
  return (
    <AdminShell aktif="Lapangan" judul="Kelola lapangan"
      keterangan="Tambah, ubah, dan nonaktifkan lapangan. Lapangan dinonaktifkan, bukan dihapus, agar riwayat dan rekap tetap utuh (BR-17)."
      aksi={<TombolAksi utama label="Tambah lapangan (backend menyusul)">+ Tambah lapangan</TombolAksi>}>
      <Tabel ariaLabel="Daftar lapangan" head={['Nama', 'Jenis olahraga', 'Harga mulai', 'Status', 'Aksi']}>
        {daftar.map((l) => (
          <tr key={l.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
            <Td strong>{l.nama}</Td>
            <Td>{l.olahraga}</Td>
            <Td strong>{formatRupiah(l.hargaMulai)} <span className="text-[13px] font-medium text-muted">/ jam</span></Td>
            <Td><BadgeAktif aktif={l.aktif} /></Td>
            <Td kanan><TombolAksi label={`Ubah ${l.nama} (backend menyusul)`}>Ubah</TombolAksi></Td>
          </tr>
        ))}
      </Tabel>
      <Catatan>
        Menonaktifkan lapangan tidak membatalkan pesanan aktifnya (BR-18); pesanan berjalan tetap diproses sampai selesai.
      </Catatan>
    </AdminShell>
  );
}
