/**
 * Login Admin — FRONTEND SAJA (simulasi). Tidak ada autentikasi sungguhan dan tidak ada sesi yang dibuat.
 * Titik integrasi backend: ganti `simulateAdminLogin` dengan pemanggilan API login admin (FR-ADM-01).
 */
export const MAX_ATTEMPTS = 5;      // percobaan gagal sebelum dibatasi (PRD 10.1: pembatasan percobaan login)
export const LOCK_SECONDS = 5 * 60; // lama pembatasan

/** Akun admin contoh (satu akun, sesuai PRD). Hanya untuk simulasi; ditampilkan sebagai petunjuk di mode pengembangan. */
export const DEMO_ADMIN = { email: "admin@gelanggang.id", password: "rahasia-admin" } as const;

export type AdminLoginInput = { email: string; password: string };
export type AdminLoginErrors = { email?: string; password?: string };

export const ADMIN_LOGIN_MESSAGES = {
  emailRequired: "Email admin wajib diisi.",
  emailFormat: "Format email tidak valid. Contoh: nama@gelanggang.id.",
  passwordRequired: "Kata sandi wajib diisi.",
  wrong: "Email atau kata sandi tidak cocok. Periksa lagi lalu coba masuk kembali.",
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validasi field wajib dan format. Kata sandi tidak di-trim. */
export function validateAdminLogin({ email, password }: AdminLoginInput): AdminLoginErrors {
  const errors: AdminLoginErrors = {};
  const e = email.trim();
  if (!e) errors.email = ADMIN_LOGIN_MESSAGES.emailRequired;
  else if (e.length > 254 || !EMAIL_RE.test(e)) errors.email = ADMIN_LOGIN_MESSAGES.emailFormat;
  if (password.length === 0) errors.password = ADMIN_LOGIN_MESSAGES.passwordRequired;
  return errors;
}

export type AdminLoginResult = { ok: true } | { ok: false };

/** Simulasi login (menunggu `delayMs` agar loading state terlihat). Mencocokkan dengan akun contoh. */
export async function simulateAdminLogin({ email, password }: AdminLoginInput, delayMs = 900): Promise<AdminLoginResult> {
  await new Promise((r) => setTimeout(r, delayMs));
  const ok = email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
  return ok ? { ok: true } : { ok: false };
}

/** "04:32" */
export const formatMMSS = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
