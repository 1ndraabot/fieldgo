"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Banner from "@/components/booking/Banner";
import FormField, { inputClass } from "@/components/ui/FormField";
import {
  ADMIN_LOGIN_MESSAGES, DEMO_ADMIN, LOCK_SECONDS, MAX_ATTEMPTS, formatMMSS, simulateAdminLogin, validateAdminLogin,
  type AdminLoginErrors,
} from "@/lib/admin-login";
import { ROUTES } from "@/lib/routes";

type Phase = "idle" | "loading" | "success";

const ARROW = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B2B1E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

/**
 * Form login admin. SIMULASI di browser (React state): tidak ada sesi atau cookie yang dibuat.
 * Batas percobaan hanya hidup selama halaman terbuka; pembatasan sungguhan harus dilakukan di server.
 */
export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<AdminLoginErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [wrong, setWrong] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockLeft, setLockLeft] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const locked = lockUntil !== null;
  const loading = phase === "loading";
  const success = phase === "success";

  // hitung mundur pembatasan; selesai → buka kembali
  useEffect(() => {
    if (lockUntil === null) return;
    const tick = () => {
      const left = Math.ceil((lockUntil - Date.now()) / 1000);
      if (left <= 0) { setLockUntil(null); setAttempts(0); setLockLeft(0); return; }
      setLockLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lockUntil]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || locked || success) return;

    const errs = validateAdminLogin({ email, password });
    setErrors(errs);
    setWrong(false);
    if (errs.email) return emailRef.current?.focus();
    if (errs.password) return passRef.current?.focus();

    setPhase("loading");
    const r = await simulateAdminLogin({ email, password });
    if (r.ok) { setPhase("success"); return; }

    setPhase("idle");
    setPassword("");
    const n = attempts + 1;
    setAttempts(n);
    if (n >= MAX_ATTEMPTS) { setLockUntil(Date.now() + LOCK_SECONDS * 1000); setLockLeft(LOCK_SECONDS); }
    else { setWrong(true); passRef.current?.focus(); }
  };

  const frozen = locked || success;          // input dikunci penuh
  const disabled = loading || frozen;        // tombol tidak bisa ditekan saat memeriksa

  return (
    <div className="relative z-[1] flex w-full max-w-[480px] flex-col gap-[22px]">
      <div>
        <h1 className="font-display text-[clamp(34px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.04em]">
          Masuk <span className="text-f4">admin</span>
        </h1>
        <p className="mt-2.5 text-base leading-[1.65] text-muted">
          Khusus pengelola. Penyewa masuk lewat{" "}
          <Link href={ROUTES.login} className="font-bold text-f6">halaman penyewa</Link>.
        </p>
      </div>

      {wrong && <Banner tone="red" role="alert" icon="alert">{ADMIN_LOGIN_MESSAGES.wrong}</Banner>}
      {locked && (
        <Banner tone="amber" role="alert" icon="clock">
          Terlalu banyak percobaan masuk. Coba lagi dalam <b aria-live="off">{formatMMSS(lockLeft)}</b>.
        </Banner>
      )}
      {success && (
        <Banner tone="green" role="status" icon="check">
          <span>
            Berhasil masuk (simulasi). Belum ada sesi nyata yang dibuat.{" "}
            <Link href={ROUTES.admin} className="font-bold underline">Lanjut ke panel admin</Link>
          </span>
        </Banner>
      )}

      <form noValidate onSubmit={onSubmit} aria-busy={loading} className="flex flex-col gap-[18px]">
        <FormField id="em" label="Email admin" error={errors.email}>
          <input
            ref={emailRef} id="em" name="email" type="email" inputMode="email" autoComplete="username"
            value={email} disabled={frozen} readOnly={loading}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); setWrong(false); }}
            aria-invalid={errors.email ? true : undefined} aria-describedby="em-msg"
            placeholder="nama@gelanggang.id"
            className={inputClass(!!errors.email)}
          />
        </FormField>

        <FormField id="pw" label="Kata sandi" error={errors.password}>
          <div className="relative flex items-center">
            <input
              ref={passRef} id="pw" name="password" type={show ? "text" : "password"} autoComplete="current-password"
              value={password} disabled={frozen} readOnly={loading}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); setWrong(false); }}
              aria-invalid={errors.password ? true : undefined} aria-describedby="pw-msg"
              className={`${inputClass(!!errors.password)} !pr-[90px]`}
            />
            <button
              type="button" onClick={() => setShow((s) => !s)} disabled={frozen}
              aria-pressed={show} aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              className="absolute right-2 h-[38px] cursor-pointer rounded-xl border-0 bg-f1 px-3.5 text-[13px] font-bold text-f6 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {show ? "Sembunyi" : "Tampil"}
            </button>
          </div>
        </FormField>

        <button
          type="submit" disabled={disabled}
          className="btn inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-f5 px-7 text-base font-bold text-white"
        >
          {loading ? "Memeriksa…" : success ? "Berhasil masuk" : "Masuk ke panel"}
          <span className="-mr-[18px] flex h-9 w-9 items-center justify-center rounded-full bg-lime">
            {loading ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B2B1E" strokeWidth="3" strokeLinecap="round" aria-hidden="true" className="animate-spin motion-reduce:animate-none"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
            ) : ARROW}
          </span>
        </button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <div className="rounded-3xl border-[1.5px] border-dashed border-[#86E3AE] bg-f0 px-4 py-3.5 text-[13px] leading-[1.6] text-muted">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[.06em]">Mode demo</span>
          Simulasi tanpa server. Akun contoh: <b className="text-f9">{DEMO_ADMIN.email}</b> / <b className="text-f9">{DEMO_ADMIN.password}</b>.
          Setelah {MAX_ATTEMPTS} kali gagal, login dibatasi sementara.
        </div>
      )}
    </div>
  );
}
