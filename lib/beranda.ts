import { db } from './db.ts';
import { tambahHari, wibSekarang } from './format.ts';
import { parseBerandaParams } from './params.ts';
import { computeSlotStatuses, type SlotInfo } from './slots.ts';

export type Ilustrasi = 'futsal' | 'badminton' | 'basket' | 'tenis';
export type KartuLapangan = {
  id: number; nama: string; deskripsi: string | null; olahraga: string; ilustrasi: Ilustrasi;
  hargaMulai: number | null; fotoUrl: string | null; urutan: number;
};
export type BerandaData = {
  olahragaList: string[];
  olahraga: string | null;
  tanggal: string;
  hariIni: string;
  kartu: KartuLapangan[];
  unggulan: { id: number; nama: string; slot: SlotInfo[] } | null;
  slotKosongHariIni: number;
  stats: { lapangan: number; cabang: number; jamTerpesan30Hari: number };
};

const ilustrasiUntuk = (olahraga: string): Ilustrasi => {
  const n = olahraga.toLowerCase();
  if (n.includes('badminton')) return 'badminton';
  if (n.includes('basket')) return 'basket';
  if (n.includes('tenis')) return 'tenis';
  return 'futsal'; // shortcut: futsal/mini soccer/lainnya memakai gambar yang sama, ganti saat ada jenis baru
};

const AKTIF = ['terkonfirmasi', 'pengajuan_pembatalan', 'menunggu_verifikasi', 'menunggu_pembayaran'] as const;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const tgl = (s: string) => new Date(s + 'T00:00:00Z');

export async function getBerandaData(
  raw: { olahraga?: string | string[]; tanggal?: string | string[] },
  now = new Date(),
): Promise<BerandaData> {
  const hariIni = wibSekarang(now).tanggal;
  const p = parseBerandaParams(raw, hariIni);
  const tanggalLain = [hariIni, p.tanggal].sort();

  // Lima kueri paralel untuk seluruh halaman (tanpa N+1).
  const [lapangan, blokir, slot, jamTerpesan] = await Promise.all([
    db.lapangan.findMany({
      where: { aktif: true }, orderBy: { id: 'asc' },
      include: { jenisOlahraga: true, tarif: true, jamOperasional: true, foto: { where: { fotoUtama: true }, take: 1 } },
    }),
    db.blokirJadwal.findMany({ where: { tanggalMulai: { lte: tgl(tanggalLain[1]) }, tanggalSelesai: { gte: tgl(tanggalLain[0]) } } }),
    db.slotPesanan.findMany({
      where: { aktif: true, tanggal: { in: [tgl(hariIni), tgl(p.tanggal)] }, pesanan: { status: { in: [...AKTIF] } } },
      select: { lapanganId: true, tanggal: true, jam: true, pesanan: { select: { status: true, batasBayarPada: true } } },
    }),
    db.slotPesanan.count({
      where: { aktif: true, tanggal: { gte: tgl(tambahHari(hariIni, -30)), lte: tgl(hariIni) }, pesanan: { status: { in: ['terkonfirmasi', 'selesai'] } } },
    }),
  ]);

  const hitung = (l: (typeof lapangan)[number], tanggal: string) => computeSlotStatuses({
    tanggal, now, lapanganAktif: l.aktif, jamOperasional: l.jamOperasional, tarif: l.tarif,
    blokir: blokir.filter((b) => b.lapanganId === l.id).map((b) => ({
      tanggalMulai: iso(b.tanggalMulai), tanggalSelesai: iso(b.tanggalSelesai), jamMulai: b.jamMulai, jamSelesai: b.jamSelesai,
    })),
    slotAktif: slot.filter((s) => s.lapanganId === l.id).map((s) => ({
      tanggal: iso(s.tanggal), jam: s.jam, status: s.pesanan.status, batasBayarPada: s.pesanan.batasBayarPada,
    })),
  });

  const jenis = [...new Map(lapangan.map((l) => [l.jenisOlahraga.id, l.jenisOlahraga.nama])).entries()]
    .sort((a, b) => a[0] - b[0]).map(([, nama]) => nama);
  const olahraga = p.olahraga && jenis.includes(p.olahraga) ? p.olahraga : null;

  const kartu = lapangan.map((l, urutan) => {
    const harga = l.tarif.map((t) => t.hargaPerJam);
    const fotoKey = l.foto[0]?.berkas;
    const base = process.env.STORAGE_PUBLIC_BASE_URL;
    return {
      id: l.id, nama: l.nama, deskripsi: l.deskripsi, olahraga: l.jenisOlahraga.nama, ilustrasi: ilustrasiUntuk(l.jenisOlahraga.nama), urutan,
      hargaMulai: harga.length ? Math.min(...harga) : null,
      fotoUrl: fotoKey && base ? `${base}/${fotoKey}` : null,
    } satisfies KartuLapangan;
  }).filter((k) => !olahraga || k.olahraga === olahraga);

  const unggulanL = lapangan.find((l) => l.id === kartu[0]?.id);
  return {
    olahragaList: jenis, olahraga, tanggal: p.tanggal, hariIni, kartu,
    unggulan: unggulanL ? { id: unggulanL.id, nama: unggulanL.nama, slot: hitung(unggulanL, p.tanggal) } : null,
    slotKosongHariIni: lapangan.reduce((n, l) => n + hitung(l, hariIni).filter((s) => s.status === 'tersedia').length, 0),
    stats: { lapangan: lapangan.length, cabang: jenis.length, jamTerpesan30Hari: jamTerpesan },
  };
}
