const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const formatRupiah = (n: number): string => 'Rp ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatJam = (h: number): string => String(h).padStart(2, '0') + '.00';

/** `jam` = jam mulai yang berurutan, mis. [20, 21] → "20.00–22.00 · 2 jam". */
export function formatRentang(jam: number[]): string {
  if (jam.length === 0) return 'Pilih jam main';
  return `${formatJam(jam[0])}–${formatJam(jam[jam.length - 1] + 1)} · ${jam.length} jam`;
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

/** Horizon pemesanan: maksimal 30 hari ke depan (sama di halaman, kalender klien, dan API slot). */
export const MAKS_HARI_MUKA = 30;

/** Menjepit tanggal ISO ke rentang [hariIni, hariIni + maks] (perbandingan string aman untuk YYYY-MM-DD). */
export function batasiTanggal(tanggal: string, hariIni: string, maks = MAKS_HARI_MUKA): string {
  const batas = tambahHari(hariIni, maks);
  if (tanggal < hariIni) return hariIni;
  return tanggal > batas ? batas : tanggal;
}

/** Label bulan untuk kalender, mis. '2026-11' → "November 2026". */
export function labelBulan(bulan: string): string {
  const [tahun, bulanKe] = bulan.split('-').map(Number);
  return `${BULAN[bulanKe - 1]} ${tahun}`;
}

export function labelPendek(tanggal: string): string {
  const d = utcDate(tanggal);
  return `${HARI[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)}`;
}

export function labelPanjang(tanggal: string): string {
  const d = utcDate(tanggal);
  return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
}

/** Hitung mundur untuk batas percobaan / kirim ulang, mis. 272 → "04:32". */
export function formatHitungMundur(detik: number): string {
  const d = Math.max(0, Math.floor(detik));
  return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
}

/** Tanggal `YYYY-MM-01` pada bulan berjalan WIB (untuk filter rekap). */
export function awalBulanWib(now: Date): string {
  return wibSekarang(now).tanggal.slice(0, 8) + '01';
}

/** Tanggal terakhir bulan berjalan WIB. */
export function akhirBulanWib(now: Date): string {
  const t = wibSekarang(now).tanggal;
  const d = new Date(t.slice(0, 7) + '-01T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

/** Label periode: "November 2026" bila satu bulan penuh, selain itu rentang tanggal. */
export function labelPeriode(dari: string, sampai: string): string {
  const a = utcDate(dari);
  const b = utcDate(sampai);
  const akhirBulan = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 0)).getUTCDate();
  const satuBulan = a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === 1
    && b.getUTCDate() === akhirBulan;
  if (satuBulan) return `${BULAN[a.getUTCMonth()]} ${a.getUTCFullYear()}`;
  const kiri = `${a.getUTCDate()} ${BULAN[a.getUTCMonth()].slice(0, 3)} ${a.getUTCFullYear()}`;
  const kanan = `${b.getUTCDate()} ${BULAN[b.getUTCMonth()].slice(0, 3)} ${b.getUTCFullYear()}`;
  return `${kiri} – ${kanan}`;
}

/** Rentang jam ringkas, mis. "20.00–22.00". */
export const rentangJam = (mulai: number, selesai: number): string => `${formatJam(mulai)}–${formatJam(selesai)}`;

/** Waktu dibuat untuk tampilan, mis. "4 Nov 2026, 12.00 WIB". */
export function labelDibuat(d: Date): string {
  const w = new Date(d.getTime() + 7 * 3600_000); // WIB = UTC+7
  const hh = String(w.getUTCHours()).padStart(2, '0');
  const mm = String(w.getUTCMinutes()).padStart(2, '0');
  return `${w.getUTCDate()} ${BULAN[w.getUTCMonth()].slice(0, 3)} ${w.getUTCFullYear()}, ${hh}.${mm} WIB`;
}
