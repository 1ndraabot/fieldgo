/** Aturan murni blacklist jadwal admin (FR-ADM-05). Dipakai server dan form. */

export type InputBlokir = {
  lapanganId: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  seharian: boolean;
  jamMulai: number | null;
  jamSelesai: number | null;
  alasan: string;
};

export const JAM_MIN = 6;
export const JAM_MAKS = 24;
export const ALASAN_MIN = 5;
export const ALASAN_MAKS = 200;

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

const tanggalSah = (t: string): boolean =>
  TANGGAL.test(t) && new Date(t + 'T00:00:00Z').toISOString().slice(0, 10) === t;

const teks = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function angka(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Normalisasi body JSON; `seharian` memaksa jam menjadi null. */
export function normalisasiBlokir(b: Record<string, unknown>): InputBlokir {
  const seharian = b.seharian === true;
  const mulai = angka(b.jamMulai);
  const selesai = angka(b.jamSelesai);

  return {
    lapanganId: Number(b.lapanganId),
    tanggalMulai: teks(b.tanggalMulai),
    tanggalSelesai: teks(b.tanggalSelesai) || teks(b.tanggalMulai),
    seharian,
    jamMulai: seharian ? null : mulai,
    jamSelesai: seharian ? null : selesai,
    alasan: teks(b.alasan),
  };
}

/** Daftar pesan galat; kosong = valid. */
export function validasiBlokir(i: InputBlokir): string[] {
  const galat: string[] = [];

  if (!Number.isInteger(i.lapanganId) || i.lapanganId <= 0) galat.push('Pilih lapangan yang akan diblokir.');
  if (!tanggalSah(i.tanggalMulai)) galat.push('Tanggal mulai blokir tidak valid.');
  if (!tanggalSah(i.tanggalSelesai)) galat.push('Tanggal selesai blokir tidak valid.');
  if (tanggalSah(i.tanggalMulai) && tanggalSah(i.tanggalSelesai) && i.tanggalSelesai < i.tanggalMulai) {
    galat.push('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  }

  if (!i.seharian) {
    if (i.jamMulai === null || i.jamSelesai === null) {
      galat.push('Pilih jam mulai dan jam selesai blokir.');
    } else if (!Number.isInteger(i.jamMulai) || !Number.isInteger(i.jamSelesai)) {
      galat.push('Jam blokir harus bilangan bulat.');
    } else if (i.jamMulai < JAM_MIN || i.jamMulai > JAM_MAKS - 1 || i.jamSelesai < JAM_MIN + 1 || i.jamSelesai > JAM_MAKS) {
      galat.push(`Jam blokir harus antara ${JAM_MIN}.00 dan ${JAM_MAKS}.00.`);
    } else if (i.jamSelesai <= i.jamMulai) {
      galat.push('Jam selesai harus setelah jam mulai.');
    }
  }

  if (i.alasan.length < ALASAN_MIN) galat.push(`Alasan blokir minimal ${ALASAN_MIN} karakter.`);
  else if (i.alasan.length > ALASAN_MAKS) galat.push(`Alasan blokir maksimal ${ALASAN_MAKS} karakter.`);

  return galat;
}
