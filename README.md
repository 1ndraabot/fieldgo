# FieldGo â€” Beranda, Masuk, Daftar

Next.js (App Router) + TypeScript + Tailwind v4 + Prisma + PostgreSQL. Spec: `docs/PRD.md`.

## Menjalankan
1. `cp .env.example .env` lalu isi `DATABASE_URL` (pooler Supabase, port 6543), `DIRECT_URL` (port 5432), dan `APP_URL`.
   Supabase dipakai **hanya sebagai host PostgreSQL** lewat Prisma. Auth dibuat sendiri (bukan Supabase Auth, bukan `supabase-js`/PostgREST).
2. `npm install`
3. `npx prisma migrate dev --name init` lalu `npm run db:seed` (6 lapangan + 4 akun dummy)
4. `npm run dev` â†’ http://localhost:3000

## Auth
- Daftar (`/daftar`) â†’ email verifikasi â†’ Masuk (`/masuk`). Sandi di-hash scrypt; sesi disimpan di tabel `sesi` (cookie `HttpOnly`, `SameSite=Lax`, 7 hari); token verifikasi 24 jam, sekali pakai.
- **Lupa kata sandi** (`/lupa-sandi` → tautan email → `/reset-sandi?token=...`): token reset berlaku **1 jam**, sekali pakai; setelah sandi berganti **semua sesi pengguna digugurkan**. Respons permintaan selalu sukses (tidak membocorkan email terdaftar).
- **Email**: `MAILER=gmail` (Gmail SMTP via nodemailer), `resend`, atau `konsol` (tautan dicetak di terminal). Bila `MAILER` kosong, urutan otomatis gmail → resend → konsol.
- Akun belum terverifikasi boleh masuk tetapi tidak boleh memesan (banner pengingat + `/pesan`).
- **Jadwal saya** (`/jadwal-saya`): hanya untuk penyewa yang masuk; menampilkan pesanan **Terkonfirmasi** dan **Menunggu pembayaran** milik akun di sesi (yang sudah selesai atau lewat batas bayar disembunyikan). Seed menambah 4 pesanan DUMMY untuk `penyewa@contoh.id` (satu berstatus Menunggu verifikasi untuk membuktikan penyaringan). Tombol "Bayar sekarang" menuju halaman Pembayaran di bawah.
- **Pembayaran** (`/pesanan/{kode}/bayar`): hanya untuk pemilik pesanan (milik orang lain = 404). Menampilkan stepper, batas bayar dengan hitung mundur, rekening tujuan (tabel `pengaturan`), unggah bukti (JPG/PNG/PDF maks 5 MB, tipe dicek dari isi berkas di server), dan ringkasan pesanan; tampilan berganti menurut status (menunggu verifikasi, terkonfirmasi, ditolak final, dibatalkan, kedaluwarsa). **Batalkan pesanan** langsung hanya selagi Menunggu pembayaran (slot dilepas). Coba dengan `FGO-DEMO-0003` dari seed.
- **Storage bukti**: bila `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` diisi, berkas ke bucket **privat** Supabase Storage (REST dari server); bila kosong (pengembangan), berkas ke folder `.data/` (dummy, di luar git). Di produksi tanpa konfigurasi, unggah ditolak. Buat bucket `bukti-pembayaran` (privat) di dashboard Supabase.
- Alur FR-PUB-05: tamu membuka `/pesan?...` â†’ diarahkan ke `/masuk?next=...` â†’ kembali ke slot yang sama. `/pesan` kini layar konfirmasi sungguhan.
- **Pemesanan** (`/pesan?lapangan=&tanggal=&mulai=&selesai=`, FR-ORD-01…05): layar konfirmasi menampilkan lapangan, tanggal, rincian harga per jam, total, dan batas bayar; tombol konfirmasi memanggil `POST /api/pesan`. Server memeriksa ulang slot di dalam satu transaksi (kunci `pg_advisory_xact_lock` per lapangan+tanggal → **anti double booking** meski indeks unik parsial belum ada), menghitung harga dari tarif (bukan dari klien), mengunci harga di `pesanan` + `slot_pesanan`, dan membuat kode `FGO-XXXXXX` (tanpa karakter ambigu). `batas_bayar_pada = min(dibuat + 24 jam, jam mulai main)` (BR-07). Slot yang sudah dipegang orang lain → 409 dan UI menawarkan buka kalender lagi.
- **Riwayat** (`/riwayat`, FR-HIS-02…05): daftar seluruh pesanan milik sesi (terbaru dulu, filter status) dari basis data, bukan data contoh. Detail `/riwayat/{kode}` menampilkan rincian, bukti transfer (nama berkas), linimasa status asli dari `riwayat_status`, alasan penolakan, dan keputusan pembatalan. Pesanan `menunggu_pembayaran` yang lewat `batas_bayar_pada` langsung ditampilkan **Kedaluwarsa** tanpa menunggu worker (BR-09). `penggunaId` selalu dari sesi; pesanan orang lain = 404.
- **Pengajuan pembatalan** (`/riwayat/{kode}/batal`, FR-CAN-01…04): hanya untuk pesanan **Terkonfirmasi** dan paling lambat H-1 pukul 23.59 WIB; tombol/form disembunyikan setelah lewat dan server memeriksa ulang. `POST /api/pesanan/{kode}/batal-ajuan` menyimpan satu `pengajuan_pembatalan` per pesanan (UNIQUE), mengubah status → **Pengajuan pembatalan** dalam satu transaksi, dan **slot tetap terisi** sampai admin memutuskan (FR-CAN-03). Pengajuan kedua → 409; pengajuan yang ditolak tidak bisa diganti (FR-CAN-04).

Akun dummy (dari seed, hanya untuk pengembangan):

| Email | Sandi | Keadaan |
|---|---|---|
| penyewa@contoh.id | Penyewa123! | terverifikasi |
| baru@contoh.id | Penyewa123! | belum verifikasi |
| nonaktif@contoh.id | Penyewa123! | dinonaktifkan |
| admin@contoh.id | Admin123! | admin — masuk via toggle "Admin" di `/masuk` atau halaman `/admin/masuk` |

Seed awal untuk Supabase (hanya 6 lapangan + akun admin, tanpa pesanan dummy): `npm run db:seed-awal`.

## Tes
`npm test`: logika murni dengan `node:test`, tanpa dependensi (Node â‰¥ 22.6): format, status slot, pilihan jam, aturan validasi, hash sandi, rate limiter, cookie, service auth, pemesanan, riwayat/pembatalan, dan handler HTTP.

## Belum ada
Backend panel admin (halaman `/admin/*` masih data dummy, guard sudah aktif), rate limit berbasis Redis (sekarang in-memory per instance), worker pembersih sesi/token kedaluwarsa, dan CHECK/UNIQUE parsial basis data (jam 6–24, slot aktif; pengaman double booking saat ini kunci transaksi).
