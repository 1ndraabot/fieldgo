// Aturan validasi: fungsi murni, dipakai form di browser DAN server (satu sumber kebenaran).
export type DaftarInput = { nama: string; email: string; nomorKontak: string; kataSandi: string; setuju: boolean };
export type MasukInput = { email: string; kataSandi: string };
export type Galat = Record<string, string>;

export const normalisasiEmail = (s: string) => s.trim().toLowerCase();
export const normalisasiKontak = (s: string) => s.trim().replace(/[\s().-]/g, '');

export function validasiNama(s: string): string | null {
  const n = s.trim().length;
  return n < 2 ? 'Nama minimal 2 karakter.' : n > 100 ? 'Nama maksimal 100 karakter.' : null;
}
export function validasiEmail(s: string): string | null {
  const e = normalisasiEmail(s);
  if (!e) return 'Email wajib diisi.';
  return e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? 'Format email tidak valid.' : null;
}
export function validasiKontak(s: string): string | null {
  const k = normalisasiKontak(s);
  if (!k) return 'Nomor kontak wajib diisi.';
  return /^\+?\d{9,15}$/.test(k) ? null : 'Nomor kontak tidak valid (9–15 digit).';
}
export function validasiSandi(s: string): string | null {
  return s.length < 8 ? 'Kata sandi minimal 8 karakter.' : s.length > 128 ? 'Kata sandi maksimal 128 karakter.' : null;
}

export function validasiDaftar(i: DaftarInput): Galat {
  const g: Galat = {};
  const set = (k: string, v: string | null) => { if (v) g[k] = v; };
  set('nama', validasiNama(i.nama));
  set('email', validasiEmail(i.email));
  set('nomorKontak', validasiKontak(i.nomorKontak));
  set('kataSandi', validasiSandi(i.kataSandi));
  set('setuju', i.setuju === true ? null : 'Kamu perlu menyetujui syarat penggunaan.');
  return g;
}

export function validasiMasuk(i: MasukInput): Galat {
  const g: Galat = {};
  const e = validasiEmail(i.email);
  if (e) g.email = e;
  if (!i.kataSandi) g.kataSandi = 'Kata sandi wajib diisi.'; // login tidak menerapkan aturan panjang
  return g;
}

const LABEL = ['Terlalu pendek', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
const WARNA = ['#E5484D', '#E5484D', '#F5A524', '#22C06B', '#0E8A4A'];
/** Skor sama dengan prototipe desain (Daftar). */
export function kekuatanSandi(s: string) {
  const skor = (s.length >= 8 ? 1 : 0) + (/[A-Z]/.test(s) && /[a-z]/.test(s) ? 1 : 0) + (/\d/.test(s) ? 1 : 0) + (/[^A-Za-z0-9]/.test(s) ? 1 : 0);
  return { skor, label: LABEL[skor], persen: Math.max(8, skor * 25), warna: WARNA[skor] };
}

export function inisial(nama: string): string {
  const huruf = nama.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  return huruf || '?';
}

/** Tujuan setelah login hanya boleh path internal; selain itu "/" (cegah open redirect). */
export function amanNext(raw: string | null | undefined): string {
  if (!raw || raw.length > 500 || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return '/';
  return /^\/(masuk|daftar|api)(\/|\?|#|$)/.test(raw) ? '/' : raw;
}
