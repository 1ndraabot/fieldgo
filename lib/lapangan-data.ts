import { ilustrasiUntuk } from './beranda.ts';
import { db } from './db.ts';
import { DEMO } from './demo.ts';
import { getLapanganDetail, type LapanganDetail } from './demo-fe.ts';
import { tanggalKeDate } from './pesan/rules.ts';
import { computeSlotStatuses, type SlotInfo } from './slots.ts';

// Kolom deskriptif (rating/kapasitas/fasilitas) belum ada di basis data; pakai default yang wajar.
const KAPASITAS: Record<string, string> = {
  badminton: '4 pemain per lapangan',
  tenis: '4 pemain (ganda)',
  basket: '10 pemain (5 lawan 5)',
  futsal: '10 pemain (5 lawan 5)',
  'mini soccer': '12 pemain (6 lawan 6)',
};
const kapasitasUntuk = (olahraga: string) => KAPASITAS[olahraga.toLowerCase()] ?? 'Sesuai jenis olahraga';
const FASILITAS_DEFAULT = ['Toilet', 'Ruang ganti', 'Parkir'];

/** Halaman detail lapangan: data lapangan, tarif, jam operasional, dan status slot dari basis data. */
export async function getHalamanLapangan(
  id: number, tanggal: string, now = new Date(),
): Promise<{ data: LapanganDetail; slot: SlotInfo[] } | null> {
  if (DEMO) {
    const d = getLapanganDetail(id, now); // tanpa database: data contoh
    if (!d) return null;
    const slot = computeSlotStatuses({
      tanggal, now, lapanganAktif: true, jamOperasional: d.jamOperasional, tarif: d.tarif, blokir: [], slotAktif: d.slotAktif,
    });
    return { data: d, slot };
  }

  const l = await db.lapangan.findUnique({
    where: { id },
    include: {
      jenisOlahraga: true, tarif: true, jamOperasional: true,
      fasilitas: { select: { fasilitas: { select: { nama: true } } } },
    },
  });
  if (!l || !l.aktif) return null; // lapangan nonaktif = tidak ada halaman publik (FR-PUB-03)

  const t = tanggalKeDate(tanggal);
  const [blokir, slot] = await Promise.all([
    db.blokirJadwal.findMany({ where: { lapanganId: id, tanggalMulai: { lte: t }, tanggalSelesai: { gte: t } } }),
    db.slotPesanan.findMany({
      where: { lapanganId: id, tanggal: t, aktif: true },
      select: { jam: true, pesanan: { select: { status: true, batasBayarPada: true } } },
    }),
  ]);

  // Fasilitas per lapangan dari junction; bila belum diatur, pakai daftar standar.
  const fasilitas = l.fasilitas.map((f) => f.fasilitas.nama);
  const daftarFasilitas = fasilitas.length ? fasilitas : FASILITAS_DEFAULT;

  const slotInfo = computeSlotStatuses({
    tanggal, now, lapanganAktif: l.aktif, jamOperasional: l.jamOperasional, tarif: l.tarif,
    blokir: blokir.map((b) => ({
      tanggalMulai: b.tanggalMulai.toISOString().slice(0, 10), tanggalSelesai: b.tanggalSelesai.toISOString().slice(0, 10),
      jamMulai: b.jamMulai, jamSelesai: b.jamSelesai,
    })),
    slotAktif: slot.map((s) => ({ tanggal, jam: s.jam, status: s.pesanan.status, batasBayarPada: s.pesanan.batasBayarPada })),
  });

  const koordinat = l.latitude !== null && l.longitude !== null
    ? `${l.latitude.toString().replace('.', ',')} · ${l.longitude.toString().replace('.', ',')}`
    : 'Belum diisi';
  const alamat = l.alamat?.trim() || 'Lokasi belum diisi';

  return {
    data: {
      id: l.id, nama: l.nama, olahraga: l.jenisOlahraga.nama, ilustrasi: ilustrasiUntuk(l.jenisOlahraga.nama),
      rating: '4.8', kapasitas: kapasitasUntuk(l.jenisOlahraga.nama),
      deskripsi: l.deskripsi ?? `Lapangan ${l.jenisOlahraga.nama} di ${alamat}.`,
      alamat, koordinat, fasilitas: daftarFasilitas,
      jamOperasional: l.jamOperasional, tarif: l.tarif, slotAktif: [],
    },
    slot: slotInfo,
  };
}
