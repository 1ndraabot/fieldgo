# Gelanggang — Beranda, Masuk, Daftar

Next.js (App Router) + TypeScript + Tailwind v4 + Prisma + PostgreSQL. Spec: `docs/PRD.md`.

## Menjalankan
1. `cp .env.example .env` lalu isi `DATABASE_URL` (pooler Supabase, port 6543), `DIRECT_URL` (port 5432), dan `APP_URL`.
   Supabase dipakai **hanya sebagai host PostgreSQL** lewat Prisma. Auth dibuat sendiri (bukan Supabase Auth, bukan `supabase-js`/PostgREST).
2. `npm install`
3. `npx prisma migrate dev --name init` lalu `npm run db:seed` (6 lapangan + 4 akun dummy)
4. `npm run dev` → http://localhost:3000

## Auth
- Daftar (`/daftar`) → email verifikasi → Masuk (`/masuk`). Sandi di-hash scrypt; sesi disimpan di tabel `sesi` (cookie `HttpOnly`, `SameSite=Lax`, 7 hari); token verifikasi 24 jam, sekali pakai.
- **Email masih DUMMY**: tautan verifikasi dicetak di terminal `npm run dev` (`[EMAIL DEV]`). Di produksi mailer sengaja menolak sampai SMTP/Resend dipasang di `lib/auth/mailer.ts`.
- Akun belum terverifikasi boleh masuk tetapi tidak boleh memesan (banner pengingat + `/pesan`).
- **Jadwal saya** (`/jadwal-saya`): hanya untuk penyewa yang masuk; menampilkan pesanan **Terkonfirmasi** dan **Menunggu pembayaran** milik akun di sesi (yang sudah selesai atau lewat batas bayar disembunyikan). Seed menambah 4 pesanan DUMMY untuk `penyewa@contoh.id` (satu berstatus Menunggu verifikasi untuk membuktikan penyaringan). Tombol "Bayar sekarang" menuju halaman Pembayaran di bawah.
- **Pembayaran** (`/pesanan/{kode}/bayar`): hanya untuk pemilik pesanan (milik orang lain = 404). Menampilkan stepper, batas bayar dengan hitung mundur, rekening tujuan (tabel `pengaturan`), unggah bukti (JPG/PNG/PDF maks 5 MB, tipe dicek dari isi berkas di server), dan ringkasan pesanan; tampilan berganti menurut status (menunggu verifikasi, terkonfirmasi, ditolak final, dibatalkan, kedaluwarsa). **Batalkan pesanan** langsung hanya selagi Menunggu pembayaran (slot dilepas). Coba dengan `GLG-DEMO-0003` dari seed.
- **Storage bukti**: bila `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` diisi, berkas ke bucket **privat** Supabase Storage (REST dari server); bila kosong (pengembangan), berkas ke folder `.data/` (dummy, di luar git). Di produksi tanpa konfigurasi, unggah ditolak. Buat bucket `bukti-pembayaran` (privat) di dashboard Supabase.
- Alur FR-PUB-05: tamu membuka `/pesan?...` → diarahkan ke `/masuk?next=...` → kembali ke slot yang sama. `/pesan` masih halaman placeholder.

Akun dummy (dari seed, hanya untuk pengembangan):

| Email | Sandi | Keadaan |
|---|---|---|
| penyewa@contoh.id | Penyewa123! | terverifikasi |
| baru@contoh.id | Penyewa123! | belum verifikasi |
| nonaktif@contoh.id | Penyewa123! | dinonaktifkan |
| admin@contoh.id | Admin123! | admin (login admin menyusul, `/masuk` menolaknya) |

## Tes
`npm test`: logika murni dengan `node:test`, tanpa dependensi (Node ≥ 22.6): format, status slot, pilihan jam, aturan validasi, hash sandi, rate limiter, cookie, service auth, dan handler HTTP.

## Belum ada
Lupa kata sandi, `/admin/masuk`, rate limit berbasis Redis (sekarang in-memory per instance), email sungguhan, worker pembersih sesi/token kedaluwarsa, CHECK/UNIQUE parsial basis data (jam 6–24, slot aktif), halaman `/lapangan/{id}`, halaman pemesanan `/pesan` (masih placeholder), dan `/riwayat`.
