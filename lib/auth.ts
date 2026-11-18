import { getSessionUser, type SessionUser } from "./server/session";

/** Status autentikasi untuk halaman (hanya server). Bersumber dari sesi bertanda tangan. */
export type AuthStatus = "guest" | "unverified" | "verified";

export function getAuthUser(): SessionUser | null {
  try { return getSessionUser(); } catch { return null; } // basis data tak tersedia → perlakukan sebagai tamu
}

export function getAuthStatus(): AuthStatus {
  const u = getAuthUser();
  return !u ? "guest" : u.verified ? "verified" : "unverified";
}
