# Gelanggang — Beranda

Next.js (App Router) + TypeScript + Tailwind v4 + Prisma + PostgreSQL. Spec: `docs/PRD.md`.

## Menjalankan
1. `cp .env.example .env` lalu isi `DATABASE_URL` (pooler Supabase, port 6543) dan `DIRECT_URL` (port 5432).
   Supabase dipakai **hanya sebagai host PostgreSQL** lewat Prisma; jangan pakai `supabase-js`/PostgREST (dilarang tech requirements).
2. `npm install`
3. `npx prisma migrate dev --name init` (membuat tabel) lalu `npm run db:seed` (6 lapangan contoh).
4. `npm run dev` → http://localhost:3000

## Tes
`npm test` menjalankan tes logika murni (`lib/format`, `lib/slots`, `lib/selection`) dengan `node:test`, tanpa dependensi (Node ≥ 22.6).

## Belum ada (menyusul sesuai PRD)
CHECK jam 6–24 dan UNIQUE parsial `slot_pesanan` (aktif) lewat SQL migrasi; login (header masih menampilkan Masuk/Daftar); halaman `/lapangan/{id}`, `/pesan`, `/masuk`, `/daftar`, `/jadwal-saya`, `/riwayat`.
