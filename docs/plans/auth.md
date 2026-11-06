# Plan: Masuk, Daftar, dan Auth

Spec: `docs/PRD.md` (ACC-01..05, FR-PUB-05, BR-02, 17.2 validasi 3 lapisan, 17.4 keamanan). Desain: board `Gelanggang_Hijau___Redesign.html` (Masuk, Daftar, Verifikasi email).
Stack: Next.js + TypeScript + Tailwind + Prisma/PostgreSQL (Supabase hanya host Postgres). Data dummy diperbolehkan sementara (email dikirim ke konsol, akun contoh lewat seed).

## Cakupan (sengaja kecil)
Daftar, verifikasi email (+kirim ulang), masuk, keluar, sesi, header status login, banner akun belum terverifikasi, `/pesan` placeholder terproteksi (bukti alur "kembali ke pemesanan").
Tidak dibuat: lupa kata sandi, `/admin/masuk`, Redis, email sungguhan.

## Tasks (TDD untuk 1-5)
1. `lib/auth/rules.ts`     aturan validasi (dipakai browser + server), kekuatan sandi, inisial, amanNext
2. `lib/auth/crypto.ts`    hash sandi (scrypt), token acak + hash
3. `lib/auth/ratelimit.ts` + `lib/auth/cookie.ts`
4. `lib/auth/service.ts`   daftar, masuk, sesi, keluar, verifikasi, kirim ulang (store in-memory untuk tes)
5. `lib/auth/handlers.ts`  lapisan HTTP (Request/Response): validasi, rate limit, cookie, kode status
6. Prisma (Sesi, TokenAkun), store Prisma, Zod pembungkus, route files, session helper, seed akun contoh
7. UI: AuthShell, MasukForm, DaftarForm, verifikasi email, header login, banner, /pesan

Test: `npm test`
