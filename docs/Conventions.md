# Conventions.md — Konvensi Kode & Aturan Pembangunan Proyek

> Aturan kerja harian: bahasa kode, penamaan, TypeScript, pola `lib/`, pengujian, Git, dan Definition of Done.
> Melengkapi: `docs/Style.md` (visual), `docs/Components-guideline.md` (komponen), `docs/Architecture.md` (arsitektur), `docs/PRD.md` (kebutuhan).

---

## 1. Bahasa Kode dan Penamaan

Proyek ini **dua-bahasa secara disengaja** — ikuti pola yang sudah ada, jangan mencampur sesuka hati:

| Ranah | Bahasa | Contoh |
|---|---|---|
| Domain & logika server (`lib/`) | Indonesia | `pengguna`, `pesanan`, `lapangan`, `wajibPenyewa`, `kirimUlangVerifikasi`, `galat` |
| UI & komponen | Indonesia untuk istilah domain, Inggris untuk istilah desain umum | `JadwalKartu`, `TombolUtama`, `BannerVerifikasi` / `Header`, `Footer` |
| Teks antarmuka | Indonesia | "Unggah bukti transfer", "Batas pembatalan telah terlewati" |
| Komentar & JSDoc | Indonesia | `/** Status slot dihitung, tidak disimpan (PRD Bagian 6). */` |
| Istilah teknis generik | Inggris | `type`, `export`, `props`, `state` |

Aturan:
- Komentar menjelaskan **mengapa**, bukan apa; wajib menyebut referensi PRD bila mengimplementasikan aturan (contoh: `// PRD 17.4`, `// BR-01`).
- JSDoc (`/** … */`) untuk fungsi publik di `lib/` dan komponen yang tidak jelas tujuannya.
- Penamaan: `PascalCase` untuk tipe/komponen/model Prisma, `camelCase` untuk fungsi/variabel, `UPPER_CASE` untuk konstanta modul (`STATUS`, `NAV`, `VARIAN`, `SESI_MS`).
- Status pesanan/slot memakai string union snake_case yang sama persis dengan enum Prisma: `'menunggu_pembayaran'`, `'terkonfirmasi'`, `'tidak_tersedia'`, dst. (lihat `lib/slots.ts`).

---

## 2. TypeScript

- `strict: true` — jangan melemahkan; dilarang `any` (pakai `unknown` + narrowing atau Zod).
- Prioritas: `type` (bukan `interface`), tipe inline untuk props kecil, `satisfies` untuk validasi bentuk, `as const` untuk konstanta map.
- Impor tipe memakai `import type` / `type IconName` inline bila hanya tipe.
- Path alias `@/*` dari root proyek (app, components, lib, tests). Import antar-berkas `lib/` memakai jalur relatif **dengan ekstensi `.ts` eksplisit** (`./format.ts`) karena pengujian dijalankan `node --experimental-strip-types`; import dari `app`/`components` memakai alias **tanpa** ekstensi (`@/lib/format`). Jangan mencampur kebalikannya.
- `npx tsc --noEmit` harus lulus tanpa galat sebelum commit.

---

## 3. Struktur Direktori & Tanggung Jawab

```
app/                 # Rute Next.js (tipis): page, layout, loading, error, api/*/route.ts
components/          # Tampilan: view per halaman + komponen fitur (lihat Components-guideline §2)
lib/                 # Semua logika: loader data, layanan, util murni — TIDAK ADA JSX di sini
├── auth/            #   fitur auth: service, handlers, schema(Zod), session, ratelimit, crypto, mailer
├── pembayaran/      #   fitur pembayaran: service, handlers, data, tampil, prisma-store
├── beranda.ts       #   loader per halaman (getBerandaData)
├── jadwal-data.ts   #   loader (getJadwalSaya)
├── slots.ts         #   logika murni status slot (dihitung, tidak disimpan — PRD Bag. 6)
├── format.ts        #   format Rupiah/jam/tanggal WIB (deterministik)
├── params.ts        #   Zod untuk query string
├── demo.ts          #   data dummy mode demo (tanpa DATABASE_URL)
└── db.ts, storage.ts, berkas.ts, site.ts, …
prisma/              # schema.prisma + migrasi + seed
tests/               # node:test, logika murni saja
docs/                # PRD, rencana, dan dokumen aturan ini
```

Aturan penempatan:
- Logika yang bisa diuji tanpa React/HTTP → `lib/` sebagai **fungsi murni** (contoh: `computeSlotStatuses`, `formatRupiah`, `pilihJam`).
- Akses database hanya lewat Prisma di loader/`*-store.ts`; komponen tidak pernah memanggil `db` langsung.
- Dilarang data dummy/hardcode sebagai pengganti fitur (PRD 17.8) — data contoh hanya lewat mekanisme **mode demo** di §5.

---

## 4. Pola `lib/` untuk Fitur Baru

Setiap fitur dengan aksi tulis mengikuti pola `auth/` & `pembayaran/`:

| Berkas | Isi |
|---|---|
| `schema.ts` | Skema Zod operasi — **satu skema dipakai frontend & backend** (PRD 17.2) |
| `service.ts` | Aturan bisnis murni; menerima deps, tidak tahu HTTP |
| `deps.ts` | Antarmuka dependensi (store, limiter, mailer, skema) → dependency injection |
| `prisma-store.ts` | Implementasi store dengan Prisma |
| `handlers.ts` | Penerjemah HTTP: parse body JSON, `safeParse`, panggil service, respons kode galat (`json(status, { ok, kode, galat })`) |
| `data.ts` / `<fitur>-data.ts` | Loader baca untuk halaman (gabungan kueri, tanpa N+1) |

Aturan handler HTTP:
- Body hanya JSON (pertahanan CSRF bersama `SameSite=Lax`); salinan pola ada di `lib/auth/handlers.ts` (`bacaBody`).
- Galat tak terduga → respons 500 generik `GALAT_SERVER`; detail hanya ke log, tidak ke klien (PRD 17.4).
- Rate limiting pada endpoint sensitif (masuk, daftar, kirim ulang, pesan, unggah bukti) memakai `Limiter`.
- Identitas, peran, harga, dan status **selalu** dari sesi/basis data — tidak pernah dipercaya dari body request (PRD AC-21).
- Route Handler di `app/api/**/route.ts` cukup delegasi: `export const runtime = 'nodejs'; export async function POST(req, { params }) { return handlersX.y(req, (await params).kode); }`

---

## 5. Mode Demo

`lib/demo.ts`: `DEMO = !process.env.DATABASE_URL`. Tanpa basis data, jalur **baca** (beranda, jadwal, pembayaran) mengembalikan data contoh sehingga FE tetap bisa dilihat; **aksi tulis tetap menolak** tanpa DB. Aturan:
- Loader baru wajib punya cabang `if (DEMO) return demo…(…)`.
- Data demo ditempatkan hanya di `lib/demo.ts`, diberi komentar jelas "palsu".
- Jangan biarkan cabang demo bocor ke perilaku tulis.

---

## 6. Basis Data (Prisma)

- Skema memakai bahasa Indonesia (`Pengguna`, `Pesanan`, `@@map("jenis_olahraga")` snake_case di DB).
- Constraint yang tidak bisa ditulis Prisma (CHECK jam 6–24, UNIQUE parsial slot aktif) ditulis lewat **berkas SQL migrasi** (PRD 17.2/17.3).
- Perubahan skema selalu lewat migrasi (`npx prisma migrate dev --name <nama>`), tidak pernah edit DB manual.
- Multi-langkah tulis (Pesanan + SlotPesanan + RiwayatStatus) wajib **satu transaksi atomik**; perubahan status memakai **pembaruan bersyarat** (status lama harus cocok) agar aksi bersamaan tidak sama-sama berhasil (PRD 17.3).
- Lapangan/pengguna tidak pernah dihapus fisik — nonaktifkan (BR-17).

---

## 7. Keamanan (ringkas; detail PRD 17.4)

- Sesi cookie `HttpOnly`, `SameSite=Lax`, 7 hari; sandi & token di-hash (scrypt sekarang).
- Otorisasi dicek **di server pada setiap endpoint** (login, terverifikasi, peran, kepemilikan, status) — menyembunyikan tombol di UI bukan pengaman.
- Secret hanya di `.env` server; `.env.example` tanpa nilai asli; dilarang awalan `NEXT_PUBLIC_` untuk secret.
- Pesan galat ke klien umum; tidak membocorkan keberadaan email/akun.
- Log dilarang memuat: sandi, token, isi bukti, nomor rekening lengkap, cookie.

---

## 8. Pengujian

- `npm test` — `node:test` native, tanpa dependensi eksternal, file di `tests/*.test.ts`.
- Yang diuji: **logika murni** — format, status slot (`slots.test.ts`), pemilihan jam berurutan (`selection.test.ts`), validasi/rules, hash sandi (`crypto.test.ts`), rate limit & cookie, service & handler auth (dengan `helpers/memory-store.ts` sebagai deps palsu).
- Wajib menambah test saat mengubah aturan bisnis inti: batas bayar (BR-07), H-1 (BR-12), harga lintas tarif (AC-05), transisi status, pemesanan bersamaan (BR-01).
- Tidak menguji komponen React untuk saat ini (di luar kebutuhan); UI diverifikasi manual lewat checklist.

---

## 9. Git

- Branch: `frontend-test` (FE), pembagian kerja ada di PRD Bagian 19.
- Pesan commit mengikuti pola yang sudah berjalan:
  - `feat: halaman Beranda (UI, loading, error)`
  - `fix: rapikan impor, URLSearchParams, README`
  - `chore: plan dan PRD sebagai spec`
  - (opsional scope) `feat(lib): status slot sesuai PRD bagian 6`
- Satu commit = satu maksud; jangan commit file hasil build (`.next/`, `tsconfig.tsbuildinfo` sudah di `.gitignore`).
- Sebelum push: `npx tsc --noEmit && npm run lint && npm test && npm run build` lulus.

---

## 10. Definition of Done — Fitur/Halaman Baru

Fitur dianggap selesai bila **semua** kotak ini tercentang:

- [ ] Fungsional sesuai FR/BR PRD yang menjadi acuan; tidak ada data dummy di luar mode demo.
- [ ] Empat keadaan tampilan lengkap: loading, kosong, berhasil, galat (PRD 17.8).
- [ ] Validasi tiga lapisan: UI, Zod di server, constraint DB (PRD 17.2).
- [ ] Otorisasi server di setiap endpoint; identitas dari sesi.
- [ ] Responsif (375/768/1440) dan sesuai `docs/Style.md`.
- [ ] Aksesibilitas sesuai Components-guideline §8.
- [ ] Tes ditambah untuk logika bisnis yang berubah; `npm test` lulus.
- [ ] `tsc --noEmit`, `lint`, `build` lulus; tidak ada warning hydration baru di dev.
- [ ] README/docs diperbarui bila menambah perintah, env, atau halaman.

---

## 11. Penyimpangan yang Diketahui (jangan ditiru, jadwalkan dirapikan)

| Lokasi | Penyimpangan | Rencana |
|---|---|---|
| `components/detail-pesanan/**` | Token warna `f*` tidak terdaftar di `@theme` → kelas tidak menghasilkan CSS | Migrasi ke token utama (Style.md §9) |
| `app/detail-pesanan/layout.tsx` | Me-render `<html>/<body>` + font/CSS duplikat → hydration mismatch | Hapus berkas; pindahkan `metadata` ke `page.tsx` |
| `app/detail-pesanan/globals.css` | Sintaks Tailwind v3 (`@tailwind …`) di proyek v4 | Hapus setelah migrasi token |
| `app/detail-pesanan/page.tsx` & modul | Default export komponen (berisiko TS2613) | Ganti ke named export saat menyentuh berkas |
| `app/detail-pesanan/page.tsx` | Halaman `detail-pesanan` belum terhubung data pesanan nyata (baru FE showcase; PRD FR-HIS-03 mengarah ke `/riwayat/{kode}`) | Putuskan: jadikan rute detail resmi `/riwayat/{kode}` dan pindahkan komponen berguna |

Aturan umum: **menyentuh berkas di area penyimpangan wajib sekaligus memperbaiki penyimpangannya** di berkas tersebut (boy-scout rule), tanpa menunggu migrasi besar.
