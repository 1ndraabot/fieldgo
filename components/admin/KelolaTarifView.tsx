import { AdminShell } from '@/components/admin/AdminShell';
import { Catatan, PilihLapangan, Tabel, Td, TombolAksi } from '@/components/admin/ui';
import { Banner } from '@/components/auth/ui';
import type { AturanTarif } from '@/lib/demo-fe';
import { formatJam, formatRupiah } from '@/lib/format';

/** Cek kelengkapan tarif (AC-20): jam operasional 6–24 harus tertutup tarif per tipe hari. */
function jamTanpaTarif(aturan: AturanTarif[]): { tipeHari: 'weekday' | 'weekend'; jam: number }[] {
  const hilang: { tipeHari: 'weekday' | 'weekend'; jam: number }[] = [];
  for (const tipe of ['weekday', 'weekend'] as const) {
    for (let jam = 6; jam < 24; jam++) {
      const ada = aturan.some((t) => t.tipeHari === tipe && jam >= t.jamMulai && jam < t.jamSelesai);
      if (!ada) hilang.push({ tipeHari: tipe, jam });
    }
  }
  return hilang;
}

/** Kelola tarif: harga per jam per tipe hari dan rentang jam (FR-ADM-03, BR-15). */
export function KelolaTarifView({ daftar, aktifId, lapanganNama, aturan }: {
  daftar: { id: number; nama: string }[]; aktifId: number; lapanganNama: string; aturan: AturanTarif[];
}) {
  const hilang = jamTanpaTarif(aturan);
  return (
    <AdminShell aktif="Tarif" judul="Kelola tarif"
      keterangan="Harga per jam berdasarkan tipe hari (hari kerja / akhir pekan) dan rentang jam. Rentang tidak boleh tumpang tindih (FR-ADM-03)."
      aksi={<TombolAksi utama label="Tambah tarif (backend menyusul)">+ Tambah tarif</TombolAksi>}>
      <PilihLapangan daftar={daftar} aktifId={aktifId} basis="/admin/tarif" />
      {hilang.length > 0 ? (
        <div className="mt-6">
          <Banner nada="amber" ikon="alert">
            {hilang.length} jam belum ditutup tarif ({hilang.slice(0, 4).map((h) => `${h.jam}.00 (${h.tipeHari})`).join(', ')}
            {hilang.length > 4 ? ' …' : ''}). Jam tanpa tarif tidak boleh dibuka untuk dipesan (BR-15) dan tampil Tidak tersedia (AC-20).
          </Banner>
        </div>
      ) : (
        <div className="mt-6">
          <Banner nada="teal" ikon="check" role="status">Seluruh jam operasional (06.00–24.00) tertutup tarif untuk dua tipe hari.</Banner>
        </div>
      )}
      <div className="mt-6">
        <Tabel ariaLabel={`Tarif ${lapanganNama}`} head={['Tipe hari', 'Rentang jam', 'Harga / jam', 'Aksi']}>
          {aturan.map((t, i) => (
            <tr key={i} className="border-b border-line last:border-b-0 hover:bg-mist/60">
              <Td strong>{t.tipeHari === 'weekday' ? 'Hari kerja' : 'Akhir pekan'}</Td>
              <Td>{formatJam(t.jamMulai)}–{formatJam(t.jamSelesai)}</Td>
              <Td strong>{formatRupiah(t.hargaPerJam)}</Td>
              <Td kanan><TombolAksi label={`Ubah tarif (backend menyusul)`}>Ubah</TombolAksi></Td>
            </tr>
          ))}
        </Tabel>
      </div>
      <Catatan>
        Perubahan tarif <strong>tidak memengaruhi pesanan yang sudah dibuat</strong> — harga dikunci saat pesanan dibuat (BR-06).
      </Catatan>
    </AdminShell>
  );
}
