import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td, TombolAksi } from '@/components/admin/ui';
import type { BarisPengguna } from '@/lib/demo-fe';

/** Kelola pengguna (FR-ADM-10): lihat daftar, status verifikasi email, aktif/nonaktif. */
export function PenggunaView({ daftar }: { daftar: BarisPengguna[] }) {
  return (
    <AdminShell aktif="Pengguna" judul="Pengguna"
      keterangan="Daftar semua pengguna terdaftar. Menonaktifkan pengguna mencegah pesanan baru tanpa menghapus data (PRD 8.8).">
      <Tabel ariaLabel="Daftar pengguna" head={['Nama', 'Email', 'Kontak', 'Pesanan', 'Gabung', 'Status', 'Aksi']}>
        {daftar.map((u) => (
          <tr key={u.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
            <Td strong>{u.nama}</Td>
            <Td>{u.email}</Td>
            <Td>{u.kontak}</Td>
            <Td strong>{u.jumlahPesanan}</Td>
            <Td>{u.gabung}</Td>
            <Td>
              <div className="flex flex-col items-start gap-1.5">
                {u.aktif ? (
                  <span className="inline-flex items-center rounded-full bg-mint px-3 py-1 text-[13px] font-bold text-[#0A6B3A]">Aktif</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[#E3EAE6] px-3 py-1 text-[13px] font-bold text-[#4F6358]">Nonaktif</span>
                )}
                {!u.terverifikasi && (
                  <span className="inline-flex items-center rounded-full bg-[#FFF1D6] px-3 py-1 text-[12px] font-bold text-[#7A4B00]">Email belum terverifikasi</span>
                )}
              </div>
            </Td>
            <Td kanan>
              <TombolAksi label={`${u.aktif ? 'Nonaktifkan' : 'Aktifkan kembali'} ${u.nama} (backend menyusul)`}>
                {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
              </TombolAksi>
            </Td>
          </tr>
        ))}
      </Tabel>
      <Catatan>
        Penyewa yang diblokir tetap bisa melihat riwayat pesanan lama, namun tidak dapat membuat pesanan baru (FR-ADM-10).
      </Catatan>
    </AdminShell>
  );
}
