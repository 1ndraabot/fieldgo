import { hariKe, wibSekarang } from './format.ts';

export type StatusSlot = 'tersedia' | 'terisi' | 'ditahan' | 'tidak_tersedia';
export type StatusPesanan =
  | 'menunggu_pembayaran' | 'menunggu_verifikasi' | 'terkonfirmasi' | 'pengajuan_pembatalan'
  | 'ditolak' | 'kedaluwarsa' | 'dibatalkan' | 'selesai';

export type SlotInput = {
  tanggal: string; // YYYY-MM-DD (WIB)
  now: Date;
  lapanganAktif: boolean;
  jamOperasional: { hari: number; buka: boolean; jamBuka: number; jamTutup: number }[]; // hari ISO 1-7
  tarif: { tipeHari: 'weekday' | 'weekend'; jamMulai: number; jamSelesai: number; hargaPerJam: number }[];
  blokir: { tanggalMulai: string; tanggalSelesai: string; jamMulai: number | null; jamSelesai: number | null }[];
  slotAktif: { tanggal: string; jam: number; status: StatusPesanan; batasBayarPada: Date | null }[];
};
export type SlotInfo = { jam: number; status: StatusSlot; harga: number | null };

/** Status slot dihitung, tidak disimpan (PRD Bagian 6). Jam 06-23 = 18 slot; jam = jam mulai. */
export function computeSlotStatuses(i: SlotInput): SlotInfo[] {
  const hari = hariKe(i.tanggal);
  const ops = i.jamOperasional.find((o) => o.hari === hari);
  const tipe = hari >= 6 ? 'weekend' : 'weekday'; // shortcut: weekend = Sabtu-Minggu, ubah bila kebijakan lain
  const sekarang = wibSekarang(i.now);

  return Array.from({ length: 18 }, (_, k) => {
    const jam = k + 6;
    const harga = i.tarif.find((t) => t.tipeHari === tipe && jam >= t.jamMulai && jam < t.jamSelesai)?.hargaPerJam ?? null;
    const buka = i.lapanganAktif && !!ops?.buka && jam >= ops.jamBuka && jam < ops.jamTutup;
    const diblokir = i.blokir.some((b) =>
      i.tanggal >= b.tanggalMulai && i.tanggal <= b.tanggalSelesai &&
      (b.jamMulai === null || b.jamSelesai === null || (jam >= b.jamMulai && jam < b.jamSelesai)));
    const lampau = i.tanggal < sekarang.tanggal || (i.tanggal === sekarang.tanggal && jam <= sekarang.jam);
    if (!buka || harga === null || diblokir || lampau) return { jam, status: 'tidak_tersedia', harga };

    const p = i.slotAktif.filter((s) => s.tanggal === i.tanggal && s.jam === jam);
    if (p.some((s) => s.status === 'terkonfirmasi' || s.status === 'pengajuan_pembatalan')) return { jam, status: 'terisi', harga };
    // menunggu_pembayaran yang lewat batas dilepas di sini juga, jadi tidak tergantung keterlambatan penjadwal
    const ditahan = p.some((s) => s.status === 'menunggu_verifikasi' ||
      (s.status === 'menunggu_pembayaran' && (s.batasBayarPada === null || s.batasBayarPada > i.now)));
    return { jam, status: ditahan ? 'ditahan' : 'tersedia', harga };
  });
}
