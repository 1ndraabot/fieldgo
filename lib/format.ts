const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const formatRupiah = (n: number): string => 'Rp ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatJam = (h: number): string => String(h).padStart(2, '0') + '.00';

/** `jam` = jam mulai yang berurutan, mis. [20, 21] → "20.00–22.00 · 2 jam". */
export function formatRentang(jam: number[]): string {
  if (jam.length === 0) return 'Pilih jam main';
  return `${formatJam(jam[0])}–${formatJam(jam[jam.length - 1] + 1)} · ${jam.length} jam`;
}

/** Hitung mundur untuk pesan 429 (rate limit), mis. 903 → "15 mnt 3 dtk", 65 → "1 mnt 5 dtk". */
export function formatHitungMundur(detik: number): string {
  const m = Math.floor(detik / 60), s = detik % 60;
  return m > 0 ? (s > 0 ? `${m} mnt ${s} dtk` : `${m} mnt`) : `${s} dtk`;
}

/** Semua perhitungan PRD memakai WIB (Asia/Jakarta, UTC+7 tanpa DST). */
export function wibSekarang(now: Date): { tanggal: string; jam: number } {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  return { tanggal: wib.toISOString().slice(0, 10), jam: wib.getUTCHours() };
}

const utcDate = (tanggal: string) => new Date(tanggal + 'T00:00:00Z');

/** ISO: Senin=1 … Minggu=7. */
export function hariKe(tanggal: string): number {
  return utcDate(tanggal).getUTCDay() || 7;
}

export function tambahHari(tanggal: string, n: number): string {
  const d = utcDate(tanggal);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function labelPendek(tanggal: string): string {
  const d = utcDate(tanggal);
  return `${HARI[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)}`;
}

export function labelPanjang(tanggal: string): string {
  const d = utcDate(tanggal);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
}
