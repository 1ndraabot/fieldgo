# Plan: Halaman Beranda (`/`)

Spec: `docs/PRD.md` (v1.2). Desain: `Gelanggang_Hijau___Redesign.html` (board "Beranda").
Stack: Next.js (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL (Supabase sebagai host Postgres saja).

## Global constraints
- PRD FR-PUB-01 (daftar lapangan), FR-PUB-02 (filter olahraga), FR-PUB-04 (status slot, PRD Bagian 6), FR-PUB-05 (Pesan membawa pilihan slot), BR-03 (jam berurutan), BR-05 (jam 06-24).
- PRD 1.4 / 10.5: tidak ada rating/ulasan, tidak ada email promosi.
- Tech doc: PostgREST/supabase-js dilarang sebagai backend; validasi query param pakai Zod; tanpa data dummy sebagai pengganti fitur.

## Tasks
1. `lib/format.ts`  - rupiah, jam, rentang, tanggal WIB. Test: `tests/format.test.ts`
2. `lib/slots.ts`   - status slot sesuai PRD Bagian 6. Test: `tests/slots.test.ts`
3. `lib/selection.ts` - pilih jam berurutan (BR-03). Test: `tests/selection.test.ts`
4. Scaffold + Prisma schema + seed + loader `lib/beranda.ts` (tanpa test otomatis: butuh DB/jaringan)
5. UI: layout, globals.css, komponen, `app/page.tsx`, loading/error (tanpa test otomatis: butuh Next)

Test command (task 1-3): `npm test`
