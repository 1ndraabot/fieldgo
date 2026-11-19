// Aturan pemesanan: fungsi murni (dipakai server dan bisa diuji tanpa database).
import { hariKe, wibSekarang } from '../format.ts';

export type TipeHari = 'weekday' | 'weekend';
export type TarifJam = { tipeHari: TipeHari; jamMulai: number; jamSelesai: number; hargaPerJam: number };
export type JamOperasionalPesan = { hari: number; buka: boolean; jamBuka: number; jamTutup: number };
export type PesanInput = { lapanganId: number; tanggal: string; mulai: number; selesai: number };
export type Galat = Record<string, string>;

export const JAM_MIN = 6;
export const JAM_MAKS = 24; // slot terakhir 23.00–24.00 (BR-05)
export const JAM_MAKS_PER_PESANAN = JAM_MAKS - JAM_MIN;

/** Tanggal `YYYY-MM-DD` disimpan sebagai tengah malam UTC agar sama dengan kolom @db.Date. */
export const tanggalKeDate = (tanggal: string) => new Date(tanggal + 'T00:00:00Z');

/** Sabtu-Minggu = weekend; ubah di sini bila kebijakan berubah. */
export const tipeHari = (tanggal: string): TipeHari => (hariKe(tanggal) >= 6 ? 'weekend' : 'weekday');

/** Rincian harga per jam; null bila ada jam yang tidak punya tarif (BR-15). */
export function rincianHarga(tarif: TarifJam[], tanggal: string, mulai: number, selesai: number): { jam: number; harga: number }[] | null {
  const tipe = tipeHari(tanggal);
  const hasil: { jam: number; harga: number }[] = [];
  for (let jam = mulai; jam < selesai; jam++) {
    const t = tarif.find((x) => x.tipeHari === tipe && jam >= x.jamMulai && jam < x.jamSelesai);
    if (!t) return null;
    hasil.push({ jam, harga: t.hargaPerJam });
  }
  return hasil;
}

/** Awal jam main dalam WIB sebagai instan UTC (WIB = UTC+7 tanpa DST). */
export function mulaiMain(tanggal: string, jam: number): Date {
  return new Date(`${tanggal}T${String(jam).padStart(2, '0')}:00:00+07:00`);
}

/**
 * `batas_bayar_pada` = min(pesanan dibuat + batas jam dari Pengaturan, jam mulai main) — BR-07.
 * `batasJam` default 24 agar pemanggil lama tetap aman.
 */
export function batasBayar(dibuat: Date, tanggal: string, jamMulai: number, batasJam = 24): Date {
  const mulai = mulaiMain(tanggal, jamMulai);
  const batas = new Date(dibuat.getTime() + batasJam * 3600_000);
  return mulai < batas ? mulai : batas;
}

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Validasi permintaan terhadap lapangan (jam operasional + tarif). Ketersediaan slot dicek terpisah. */
export function validasiPesan(
  i: PesanInput,
  lapangan: { aktif: boolean; jamOperasional: JamOperasionalPesan[]; tarif: TarifJam[] } | null,
  now: Date,
): Galat {
  const g: Galat = {};
  if (!lapangan || !lapangan.aktif) {
    g.lapangan = 'Lapangan tidak ditemukan atau sedang tidak aktif.';
    return g; // tanpa data lapangan, aturan lain tidak bisa diperiksa
  }

  const tanggalSah = TANGGAL.test(i.tanggal) && tanggalKeDate(i.tanggal).toISOString().slice(0, 10) === i.tanggal;
  if (!tanggalSah) g.tanggal = 'Tanggal tidak valid.';

  const bulat = Number.isInteger(i.mulai) && Number.isInteger(i.selesai);
  if (!bulat || i.mulai < JAM_MIN || i.selesai > JAM_MAKS || i.selesai <= i.mulai) {
    g.jam = `Pilih jam berurutan antara ${JAM_MIN}.00 dan ${JAM_MAKS}.00.`;
  } else if (i.selesai - i.mulai > JAM_MAKS_PER_PESANAN) {
    g.jam = `Maksimal ${JAM_MAKS_PER_PESANAN} jam per pesanan.`;
  }

  if (tanggalSah && bulat) {
    const sekarang = wibSekarang(now);
    if (i.tanggal < sekarang.tanggal) g.tanggal = 'Tanggal sudah lewat.';
    else if (i.tanggal === sekarang.tanggal && i.mulai <= sekarang.jam) g.jam = 'Jam ini sudah mulai atau lewat. Pilih jam berikutnya.';

    const hari = hariKe(i.tanggal);
    const ops = lapangan.jamOperasional.find((o) => o.hari === hari);
    if (!ops?.buka) g.jam = 'Lapangan tutup pada hari itu.';
    else if (i.mulai < ops.jamBuka || i.selesai > ops.jamTutup) {
      g.jam = `Di luar jam operasional (${String(ops.jamBuka).padStart(2, '0')}.00–${String(ops.jamTutup).padStart(2, '0')}.00).`;
    } else if (!g.jam && !rincianHarga(lapangan.tarif, i.tanggal, i.mulai, i.selesai)) {
      g.jam = 'Sebagian jam yang dipilih belum punya tarif.';
    }
  }
  return g;
}
