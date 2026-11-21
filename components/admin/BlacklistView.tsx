import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, Tabel, Td, TombolAksi } from '@/components/admin/ui';
import BlacklistForm from '@/components/admin/BlacklistForm';
import type { BarisBlokir } from '@/lib/demo-fe';
import { labelPanjang } from '@/lib/format';

const rentangJam = (b: BarisBlokir) => (b.jamMulai === null || b.jamSelesai === null ? 'Seharian' : `${String(b.jamMulai).padStart(2, '0')}.00–${String(b.jamSelesai).padStart(2, '0')}.00`);

/** Kelola blacklist/pemblokiran jadwal (FR-ADM-05): daftar blokir aktif + form tambah dengan cek bentrok (AC-15). */
export function BlacklistView({ daftarLapangan, baris, bentrokDemo }: {
  daftarLapangan: { id: number; nama: string }[]; baris: BarisBlokir[]; bentrokDemo: string[];
}) {
  return (
    <AdminShell aktif="Blacklist" judul="Blacklist jadwal"
      keterangan="Blokir slot untuk perbaikan atau acara internal. Slot terblokir tidak dapat dipesan dan tampil Terisi pada kalender penyewa (PRD 8.3).">
      <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
        <div>
          <Tabel ariaLabel="Daftar blokir jadwal" head={['Lapangan', 'Tanggal', 'Jam', 'Alasan', 'Aksi']}>
            {baris.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-b-0 hover:bg-mist/60">
                <Td strong>{b.lapanganNama}</Td>
                <Td>{b.tanggalMulai === b.tanggalSelesai ? labelPanjang(b.tanggalMulai) : `${labelPanjang(b.tanggalMulai)} – ${labelPanjang(b.tanggalSelesai)}`}</Td>
                <Td>{rentangJam(b)}</Td>
                <Td>{b.alasan}</Td>
                <Td kanan><TombolAksi label={`Hapus blokir ${b.lapanganNama} (backend menyusul)`}>Hapus</TombolAksi></Td>
              </tr>
            ))}
          </Tabel>
          <Catatan>
            Menghapus blokir tidak mengembalikan pesanan yang terlanjur ditolak; slotnya langsung dapat dipesan kembali.
          </Catatan>
        </div>

        <div className="rounded-[28px] border-[1.5px] border-line bg-mist p-6">
          <h2 className="font-display text-xl font-bold">Tambah blokir</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            Jika blokir menimpa pesanan aktif, sistem meminta konfirmasi sebelum pesanan terdampak dibatalkan (AC-15).
          </p>
          <div className="mt-5">
            <BlacklistForm daftarLapangan={daftarLapangan} bentrokDemo={bentrokDemo} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
