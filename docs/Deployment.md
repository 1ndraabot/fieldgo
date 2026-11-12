# Deployment.md — Panduan Deployment & Lingkungan

> Cara menjalankan proyek di lingkungan baru dan produksi. Sumber: `README.md`, `docs/PRD.md` Bagian 17.9, `.env.example`.

---

## 1. Persyaratan Sistem

| Alat | Versi minimum | Catatan |
|---|---|---|
| Node.js | 22.6+ | Untuk `node --experimental-strip-types` (tes) |
| npm | sesuai lockfile | `package-lock.json` terikat |
| PostgreSQL | — | Supabase pooler (port 6543) untuk runtime; langsung (port 5432) untuk migrasi |
| Redis | — | Untuk worker dan rate limiting (produksi) |
| Object storage | — | Supabase Storage / R2 / S3 / MinIO (foto publik, bukti privat) |

Lingkungan lokal lengkap dapat dibangun dengan Docker Compose: PostgreSQL + Redis + MinIO (PRD 11).

---

## 2. Langkah Instalasi (lingkungan baru)

```bash
# 1. Clone repositori
git clone <repo>
cd gelanggang

# 2. Salin contoh env dan isi nilai asli
cp .env.example .env
# Isi: DATABASE_URL, DIRECT_URL, APP_URL, (opsional) SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 3. Instal dependensi
npm install

# 4. Siapkan basis data
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed   # 6 lapangan + 4 akun dummy

# 5. Jalankan pengembangan
npm run dev       # http://localhost:3000
```

Akun dummy dari seed (hanya pengembangan):

| Email | Sandi | Keadaan |
|---|---|---|
| penyewa@contoh.id | Penyewa123! | terverifikasi |
| baru@contoh.id | Penyewa123! | belum verifikasi |
| nonaktif@contoh.id | Penyewa123! | dinonaktifkan |
| admin@contoh.id | Admin123! | admin |

---

## 3. Variabel Lingkungan (`env`)

| Variabel | Wajib? | Contoh | Catatan |
|---|---|---|---|
| `DATABASE_URL` | Ya | `postgresql://…:6543/postgres?pgbouncer=true` | Pooler Supabase untuk runtime |
| `DIRECT_URL` | Ya | `postgresql://…:5432/postgres` | Langsung untuk migrasi Prisma |
| `APP_URL` | Ya | `http://localhost:3000` | URL publik untuk tautan verifikasi email |
| `STORAGE_PUBLIC_BASE_URL` | Tidak | `https://…supabase.co/storage/v1/object/public/foto-lapangan` | Tanpa slash akhir |
| `SUPABASE_URL` | Tidak | `https://…supabase.co` | Server-side saja; bukti privat |
| `SUPABASE_SERVICE_ROLE_KEY` | Tidak | — | Server-side saja; **jangan** awali `NEXT_PUBLIC_` |
| `BUKTI_BUCKET` | Tidak | `bukti-pembayaran` | Buat bucket privat di dashboard Supabase |

Aturan: secret **tidak** masuk repositori. `.env.example` disediakan tanpa nilai asli.

---

## 4. Build & Produksi

```bash
# Build produksi (TypeScript, lint, static pages)
npm run build

# Jalankan server produksi
npm run start   # http://localhost:3000 (port dari env PORT)
```

Pastikan `npm run build` lulus tanpa galat sebelum deploy. Produksi wajib HTTPS (keamanan cookie + Web Push; lokal boleh karena secure context browser).

---

## 5. Worker (Proses Terpisah)

Worker diproses sebagai proses CLI terpisah di repo yang sama, bukan layanan terpisah:

```bash
# Perintah worker dijelaskan di README setelah implementasi worker diselesaikan
# (PRD Bagian 8 & 17.6: BullMQ + Redis, pengiriman Web Push, proses berulang)
```

Worker memproses: pengiriman Web Push, kedaluwarsa pesanan, selesai, pembersihan token, penyapu notifikasi. Kegagalan push tidak membatalkan transaksi bisnis yang tersimpan.

---

## 6. Object Storage

| Jenis | Bucket | Akses |
|---|---|---|
| Foto lapangan | Publik | Dapat dilihat siapa pun; diunggah hanya admin |
| Bukti pembayaran | **Privat** | Hanya pemilik pesanan dan admin |

- Unggah lewat backend: server memeriksa tipe/ukuran berkas sebelum menyimpan dengan nama acak.
- Basis data hanya menyimpan kunci objek + metadata.
- Bukti ditampilkan via URL bertanda tangan berumur pendek (disarankan 5 menit) setelah pengecekan hak akses.

---

## 7. CI (GitHub Actions) — Disarankan

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

Setiap PR harus lulus lint, tes, dan build sebelum merge (PRD 17.8).

---

## 8. Monitoring & Error

- Log terstruktur (Pino) dengan konteks: waktu, level, request id, `pengguna_id`, `kode pesanan`, durasi.
- Dilarang mencatat: sandi, token, kunci privat, isi bukti, nomor rekening lengkap, cookie.
- Sentry (atau setara) pada aplikasi web dan worker.
- Worker tidak boleh gagal diam-diam: mulai, selesai, gagal, durasi, percobaan dicatat.

---

## 9. Daftar Periksa Sebelum Produksi

- [ ] `.env` diisi dengan nilai produksi (bukan contoh).
- [ ] `DATABASE_URL` dan `DIRECT_URL` terhubung ke basis data produksi.
- [ ] Migrasi + seed berhasil dijalankan.
- [ ] `npm run build` lulus tanpa galat.
- [ ] Bucket `bukti-pembayaran` (privat) dibuat di penyedia storage.
- [ ] `STORAGE_PUBLIC_BASE_URL` diisi untuk foto lapangan publik.
- [ ] HTTPS diaktifkan (produksi).
- [ ] Sentry/logging terpasang.
- [ ] README dan dokumen ini diperbarui bila ada perubahan perintah/env/halaman.
