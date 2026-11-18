import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";

/**
 * Sesi sederhana: cookie httpOnly `gh_session` = "<idPengguna>.<HMAC>".
 * Identitas pemesan SELALU diambil dari sini, tidak pernah dari body request.
 * Ganti dengan sistem autentikasi penuh (hash kata sandi, rotasi sesi) saat halaman Masuk/Daftar dibangun.
 */
export const SESSION_COOKIE = "gh_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = { id: number; name: string; email: string; verified: boolean };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET wajib diisi di produksi.");
  return "dev-only-secret-ganti-di-produksi";
}
const mac = (id: number) => createHmac("sha256", secret()).update(String(id)).digest("base64url");

export const signSession = (userId: number) => `${userId}.${mac(userId)}`;

function verify(value: string | undefined): number | null {
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig || !/^\d+$/.test(id)) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(Number(id)));
  return a.length === b.length && timingSafeEqual(a, b) ? Number(id) : null;
}

export function getSessionUser(): SessionUser | null {
  const id = verify(cookies().get(SESSION_COOKIE)?.value);
  if (id === null) return null;
  const u = getDb().prepare("SELECT id, nama, email, email_terverifikasi_pada, dinonaktifkan_pada FROM pengguna WHERE id = ?").get(id);
  if (!u || u.dinonaktifkan_pada !== null) return null; // akun nonaktif tidak dapat masuk (FR-ACC05)
  return { id: Number(u.id), name: String(u.nama), email: String(u.email), verified: u.email_terverifikasi_pada !== null };
}
