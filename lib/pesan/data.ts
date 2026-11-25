import { db } from '../db.ts';
import { DEMO } from '../demo.ts';
import { getLapanganDetail } from '../demo-fe.ts';
import { computeSlotStatuses, type SlotInfo } from '../slots.ts';
import { batasBayar, rincianHarga, tanggalKeDate } from './rules.ts';

export type PesanData = {
  lapangan: { id: number; nama: string; olahraga: string; alamat: string };
  tanggal: string;
  mulai: number;
  selesai: number;
  jam: { jam: number; harga: number; tersedia: boolean }[];
  total: number;
  tersedia: boolean;
  batasBayarPada: Date;
  /** Batas bayar global (jam) untuk teks penjelasan di layar konfirmasi. */
  batasBayarJam: number;
};

/** Data layar konfirmasi (FR-ORD-02). Harga hanya tampilan; server menghitung ulang saat pesanan dibuat (BR-06). */
export async function getPesanData(
  i: { lapanganId: number; tanggal: string; mulai: number; selesai: number },
  now = new Date(),
  batasBayarJam = 24,
): Promise<PesanData | null> {
  const susun = (lapangan: PesanData['lapangan'], tarif: Parameters<typeof rincianHarga>[0], slot: SlotInfo[]): PesanData => {
    const dipilih = slot.filter((s) => s.jam >= i.mulai && s.jam < i.selesai);
    const rincian = dipilih.map((s) => ({ jam: s.jam, harga: s.harga ?? 0 }));
    return {
      lapangan, tanggal: i.tanggal, mulai: i.mulai, selesai: i.selesai, jam: dipilih.map((s) => ({ jam: s.jam, harga: s.harga ?? 0, tersedia: s.status === 'tersedia' })),
      total: rincian.reduce((n, r) => n + r.harga, 0),
      tersedia: dipilih.length === i.selesai - i.mulai && dipilih.every((s) => s.status === 'tersedia'),
      batasBayarPada: batasBayar(now, i.tanggal, i.mulai, batasBayarJam),
      batasBayarJam,
    };
  };

  if (DEMO) {
    const d = getLapanganDetail(i.lapanganId, now); // tanpa database: data contoh
    if (!d) return null;
    const r = rincianHarga(d.tarif, i.tanggal, i.mulai, i.selesai);
    if (!r) return null; // di luar tarif = tidak bisa dipesan, sama seperti mode database
    return {
      lapangan: { id: d.id, nama: d.nama, olahraga: d.olahraga, alamat: d.alamat },
      tanggal: i.tanggal, mulai: i.mulai, selesai: i.selesai,
      jam: r.map((x) => ({ ...x, tersedia: true })), total: r.reduce((n, x) => n + x.harga, 0),
      tersedia: true, batasBayarPada: batasBayar(now, i.tanggal, i.mulai, batasBayarJam), batasBayarJam,
    };
  }

  const l = await db.lapangan.findUnique({
    where: { id: i.lapanganId },
    include: { jenisOlahraga: true, tarif: true, jamOperasional: true },
  });
  if (!l || !l.aktif) return null;

  const t = tanggalKeDate(i.tanggal);
  const [blokir, slot] = await Promise.all([
    db.blokirJadwal.findMany({ where: { lapanganId: l.id, tanggalMulai: { lte: t }, tanggalSelesai: { gte: t } } }),
    db.slotPesanan.findMany({
      where: { lapanganId: l.id, tanggal: t, aktif: true },
      select: { jam: true, pesanan: { select: { status: true, batasBayarPada: true } } },
    }),
  ]);
  const slotInfo = computeSlotStatuses({
    tanggal: i.tanggal, now, lapanganAktif: l.aktif, jamOperasional: l.jamOperasional, tarif: l.tarif,
    blokir: blokir.map((b) => ({
      tanggalMulai: b.tanggalMulai.toISOString().slice(0, 10), tanggalSelesai: b.tanggalSelesai.toISOString().slice(0, 10),
      jamMulai: b.jamMulai, jamSelesai: b.jamSelesai,
    })),
    slotAktif: slot.map((s) => ({ tanggal: i.tanggal, jam: s.jam, status: s.pesanan.status, batasBayarPada: s.pesanan.batasBayarPada })),
  });
  return susun({ id: l.id, nama: l.nama, olahraga: l.jenisOlahraga.nama, alamat: l.alamat?.trim() || 'Lokasi belum diisi' }, l.tarif, slotInfo);
}
