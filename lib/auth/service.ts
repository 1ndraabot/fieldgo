import { buatToken, hashPassword, hashToken, verifyPassword } from './crypto.ts';
import { normalisasiEmail, normalisasiKontak } from './rules.ts';

export type Peran = 'penyewa' | 'admin';
export type Pengguna = {
  id: number; nama: string; email: string; kataSandi: string; nomorKontak: string; peran: Peran;
  emailTerverifikasiPada: Date | null; dinonaktifkanPada: Date | null;
};

export class EmailSudahAda extends Error {}

export interface AuthStore {
  cariPenggunaByEmail(email: string): Promise<Pengguna | null>;
  cariPenggunaById(id: number): Promise<Pengguna | null>;
  /** Melempar EmailSudahAda bila email sudah terdaftar (keunikan dijaga basis data). */
  buatPengguna(d: { nama: string; email: string; kataSandi: string; nomorKontak: string }): Promise<Pengguna>;
  buatToken(d: { penggunaId: number; jenis: JenisToken; tokenHash: string; kedaluwarsaPada: Date }): Promise<void>;
  batalkanTokenAktif(penggunaId: number, jenis: JenisToken): Promise<void>;
  /** Atomik: menandai terpakai hanya bila belum terpakai dan belum kedaluwarsa. Mengembalikan pemilik token. */
  pakaiToken(tokenHash: string, jenis: JenisToken, now: Date): Promise<number | null>;
  tandaiTerverifikasi(penggunaId: number, now: Date): Promise<void>;
  /** Ganti hash kata sandi (dipakai reset sandi). */
  ubahSandi(penggunaId: number, kataSandiHash: string): Promise<void>;
  buatSesi(d: { penggunaId: number; tokenHash: string; kedaluwarsaPada: Date }): Promise<void>;
  cariSesi(tokenHash: string, now: Date): Promise<Pengguna | null>;
  hapusSesi(tokenHash: string): Promise<void>;
  /** Gugurkan semua sesi pengguna (dipakai setelah reset sandi). */
  hapusSesiPengguna(penggunaId: number): Promise<void>;
}

export type JenisToken = 'verifikasi_email' | 'reset_sandi';

export interface Mailer {
  kirim(surat: { ke: string; subjek: string; teks: string }): Promise<void>;
}

export type AuthDeps = { store: AuthStore; mailer: Mailer; sekarang: () => Date; baseUrl: string };

export const SESI_MS = 7 * 24 * 3600_000;
const TOKEN_VERIFIKASI_MS = 24 * 3600_000;
const TOKEN_RESET_MS = 1 * 3600_000; // tautan reset sandi lebih pendek: satu jam (FR-ACC-04)

// Hash pura-pura agar login email tak dikenal memakan waktu sama dengan email dikenal.
let hashPuraPura: Promise<string> | undefined;
const puraPura = () => (hashPuraPura ??= hashPassword('tidak-ada-pengguna'));

async function kirimTokenVerifikasi(d: AuthDeps, p: Pengguna) {
  await d.store.batalkanTokenAktif(p.id, 'verifikasi_email'); // tautan lama gugur
  const { token, hash } = buatToken();
  await d.store.buatToken({
    penggunaId: p.id, jenis: 'verifikasi_email', tokenHash: hash,
    kedaluwarsaPada: new Date(d.sekarang().getTime() + TOKEN_VERIFIKASI_MS),
  });
  try {
    await d.mailer.kirim({
      ke: p.email, subjek: 'Verifikasi email FieldGo',
      teks: `Halo ${p.nama},\n\nBuka tautan ini untuk memverifikasi email kamu (berlaku 24 jam, sekali pakai):\n${d.baseUrl}/verifikasi-email?token=${token}\n`,
    });
  } catch (e) {
    // Pendaftaran tidak boleh gagal karena email; pengguna bisa meminta kirim ulang.
    console.error('[auth] gagal mengirim email verifikasi', e);
  }
}

export async function daftar(
  d: AuthDeps, i: { nama: string; email: string; nomorKontak: string; kataSandi: string },
): Promise<{ ok: true } | { ok: false; kode: 'EMAIL_DIPAKAI' }> {
  const kataSandi = await hashPassword(i.kataSandi);
  let p: Pengguna;
  try {
    p = await d.store.buatPengguna({ nama: i.nama.trim(), email: normalisasiEmail(i.email), kataSandi, nomorKontak: normalisasiKontak(i.nomorKontak) });
  } catch (e) {
    if (e instanceof EmailSudahAda) return { ok: false, kode: 'EMAIL_DIPAKAI' };
    throw e;
  }
  await kirimTokenVerifikasi(d, p);
  return { ok: true };
}

export async function masuk(
  d: AuthDeps, i: { email: string; kataSandi: string; peran: Peran },
): Promise<{ ok: true; token: string; kedaluwarsa: Date; pengguna: Pengguna } | { ok: false; kode: 'KREDENSIAL_SALAH' | 'AKUN_NONAKTIF' }> {
  const p = await d.store.cariPenggunaByEmail(normalisasiEmail(i.email));
  const benar = await verifyPassword(i.kataSandi, p?.kataSandi ?? (await puraPura()));
  if (!p || !benar || p.peran !== i.peran) return { ok: false, kode: 'KREDENSIAL_SALAH' };
  if (p.dinonaktifkanPada) return { ok: false, kode: 'AKUN_NONAKTIF' }; // baru diketahui setelah sandi benar
  const { token, hash } = buatToken();
  const kedaluwarsa = new Date(d.sekarang().getTime() + SESI_MS);
  await d.store.buatSesi({ penggunaId: p.id, tokenHash: hash, kedaluwarsaPada: kedaluwarsa });
  return { ok: true, token, kedaluwarsa, pengguna: p };
}

export async function ambilPengguna(d: AuthDeps, token: string | null): Promise<Pengguna | null> {
  if (!token) return null;
  const p = await d.store.cariSesi(hashToken(token), d.sekarang());
  return p && !p.dinonaktifkanPada ? p : null;
}

export async function keluar(d: AuthDeps, token: string | null): Promise<void> {
  if (token) await d.store.hapusSesi(hashToken(token));
}

export async function verifikasiEmail(d: AuthDeps, token: string): Promise<'ok' | 'tidak_valid'> {
  const now = d.sekarang();
  const id = await d.store.pakaiToken(hashToken(token), 'verifikasi_email', now);
  if (id === null) return 'tidak_valid';
  await d.store.tandaiTerverifikasi(id, now);
  return 'ok';
}

export async function kirimUlangVerifikasi(d: AuthDeps, penggunaId: number): Promise<'terkirim' | 'sudah_terverifikasi' | 'tidak_ada'> {
  const p = await d.store.cariPenggunaById(penggunaId);
  if (!p) return 'tidak_ada';
  if (p.emailTerverifikasiPada) return 'sudah_terverifikasi';
  await kirimTokenVerifikasi(d, p);
  return 'terkirim';
}

/** Minta tautan reset sandi (FR-ACC-04). Selalu "ok" — jangan membocorkan email mana yang terdaftar (anti-enumeration). */
export async function lupaSandi(d: AuthDeps, email: string): Promise<{ ok: true }> {
  const p = await d.store.cariPenggunaByEmail(normalisasiEmail(email));
  if (!p || p.dinonaktifkanPada) return { ok: true }; // diam: respons identik dengan email tak dikenal
  await d.store.batalkanTokenAktif(p.id, 'reset_sandi'); // tautan lama gugur
  const { token, hash } = buatToken();
  await d.store.buatToken({
    penggunaId: p.id, jenis: 'reset_sandi', tokenHash: hash,
    kedaluwarsaPada: new Date(d.sekarang().getTime() + TOKEN_RESET_MS),
  });
  try {
    await d.mailer.kirim({
      ke: p.email, subjek: 'Reset kata sandi FieldGo',
      teks: `Halo ${p.nama},\n\nBuka tautan ini untuk mengatur kata sandi baru (berlaku 1 jam, sekali pakai):\n${d.baseUrl}/reset-sandi?token=${token}\n\nBukan kamu yang meminta? Abaikan email ini — kata sandimu tidak berubah.\n`,
    });
  } catch (e) {
    console.error('[auth] gagal mengirim email reset sandi', e);
  }
  return { ok: true };
}

/** Pakai tautan reset: token atomik → ganti sandi → gugurkan semua sesi pengguna. */
export async function resetSandi(d: AuthDeps, i: { token: string; kataSandi: string }): Promise<'ok' | 'tidak_valid'> {
  const now = d.sekarang();
  const id = await d.store.pakaiToken(hashToken(i.token), 'reset_sandi', now);
  if (id === null) return 'tidak_valid';
  const kataSandi = await hashPassword(i.kataSandi);
  await d.store.ubahSandi(id, kataSandi);
  await d.store.hapusSesiPengguna(id); // semua perangkat ter-logout setelah sandi berganti
  return 'ok';
}
