# Architecture.md — Arsitektur Sistem Gelanggang

> Gambaran besar kode: lapisan, arus data, arsitektur komponen, dan alur permintaan. Referensi `docs/PRD.md` Bagian 17 (persyaratan teknis) dan 18 (pemetaan).

---

## 1. Ringkasan Tinggi (High-Level)

```
┌─────────────────┐     HTTPS      ┌─────────────────────────────────────┐
│ Browser (RSC)   │ ◄─────────────►│ Next.js App Router (server + client)│
│                 │                │  ├── app/page.tsx                   │
│                 │                │  ├── app/api/**/route.ts            │
│                 │                │  └── app/layout.tsx                 │
└─────────────────┘                └──────────────┬──────────────────────┘
                                                   │ Prisma ORM (SQL)
                                                   ▼
                                          ┌─────────────────┐
                                          │ PostgreSQL      │
                                          │ (Supabase pooler│
                                          │  / DIRECT_URL   │
                                          │  untuk migrasi) │
                                          └─────────────────┘

Worker terpisah (proses CLI di repo yang sama):
┌──────────────┐    Redis/BullMQ   ┌──────────────────┐    Web Push
│ Proses Worker│ ◄────────────────►│ Antrean persisten│ ◄──────────────► Browser
│ (kedaluwarsa,│    (lokal Docker) │ pekerjaan server │       (VAPID)
│ selesai, push│                   │ & pengiriman     │
│ scan token)  │                   │ notifikasi       │
└──────────────┘                   └──────────────────┘
```

### Runciman inti

| Lapisan | Tanggung jawab | Direktori utama |
|---|---|---|
| Rute & tampilan | Next.js App Router: server component, client component minimal, API Route Handler | `app/` |
| Tampilan | Komponen UI statis + view per halaman, tanpa JSX logika bisnis | `components/` |
| Logika bisnis & loader | Fungsi murni, Zod, format WIB, akses DB via Prisma | `lib/`, `lib/auth/`, `lib/pembayaran/` |
| Basis data | PostgreSQL, skema lewat Prisma + migrasi SQL | `prisma/` |
| Worker | Proses terpisah: pengiriman Web Push + pekerjaan berulang | CLI di repo yang sama (perintah di README) |
| Penyimpanan berkas | Object storage privat (Supabase Storage/R2/S3/MinIO); publik untuk foto lapangan | `lib/storage.ts`, `lib/berkas.ts` |

### Prinsip desain

- **Monolitik dalam satu repo:** aplikasi web dan worker hidup di repositori yang sama, satu basis data relasional (PRD 11).
- **Server default:** halaman Server Component; `'use client'` seminimal mungkin (Components-guideline §3).
- **Data dihitung, tidak disimpan:** status slot kalender dihitung ulang saat dibuka (`lib/slots.ts`); tidak ada risiko tidak sinkron (PRD Bagian 6).
- **Tiga lapisan validasi:** UI → Zod server → constraint basis data (PRD 17.2).
- **Otorisasi di server setiap endpoint:** identitas dan peran dari sesi, tidak pernah dipercaya dari client (PRD 17.4).
- **Mode demo:** tanpa `DATABASE_URL`, jalur baca pakai data palsu di `lib/demo.ts`; tulis tetap ditolak.

---

## 2. Arus Permintaan

### 2.1 Halaman Publik Berdata (contoh: beranda)

```
Browser ──► GET / ──► page.tsx (Server Component)
                      │
                      ├─► getBerandaData(searchParams) ──► Prisma ──► DB
                      │      └─► BerandaData (serializable)
                      │
                      ├─► penggunaSaatIni() ──► cookie sesi ──► DB
                      │      └─► pengguna.nama
                      │
                      └─► render komponen (Header, Hero, Stats, …)
                            └─► HTML statis dikirim ke browser
```

- Memuat data paralel (`Promise.all`).
- `dynamic = 'force-dynamic'` bila data berubah seiring waktu (slot, batas bayar).
- Client tidak pernah ambil data halaman sendiri.

### 2.2 Aksi Tulis (contoh: unggah bukti pembayaran)

```
Browser ──► POST /api/pesanan/{kode}/bukti ──► route.ts ──► handlers.batal/bukti
                                               │                 (lib/pembayaran/handlers.ts)
                                               │                 JSON body, validasi tipe/ukuran
                                               │                 ──► service.ts (bukan client!)
                                               │                 ──► prisma-store.ts ──► DB (transaksi)
                                               │                 ──► NotifikasiPush (outbox)
                                               │                 ──► antrean BullMQ
                                               └──────────────────────► JSON 200/400/401/409/429
```

- Route Handler sangat tipis; validasi & bisnis di `lib/`.
- Client hanya menerima kode galat mesin (`VALIDASI`, `DIBATASI`, `STATUS_BERUBAH`, …) dan menerjemahkannya ke Indonesia (Components-guideline §7).
- Sukses → `router.refresh()`; server merender ulang dengan data terbaru.

### 2.3 Arus Web Push & Worker

```
Kejadian bisnis (ubah status pesanan)
   └─► 1. Transaksi DB menulis NotifikasiPush(status=menunggu) [pola outbox]
   └─► 2. Kerjaan BullMQ (pengenal tetap, anti-duplikat)
   └─► 3. Proses worker: web-push (VAPID) ke semua subscription penerima
   └─► 4. Perbarui NotifikasiPush status (terkirim/gagal)
   └─► 5. Browser Service Worker menampilkan notifikasi

Proses berulang (setiap 5 menit, worker):
   Kedaluwarsa (Menunggu pembayaran lewat batas)
   Selesai (Terkonfirmasi lewat jam main)
   Pembersihan token kedaluwarsa/dipakai
   Penyapu notifikasi (masukkan kembali antrean yang gagal)
```

- Kegagalan push **tidak membatalkan** transaksi bisnis yang sudah tersimpan (PRD 17.6).
- Worker adalah proses CLI terpisah di repo yang sama, bukan layanan terpisah.

---

## 3. Arsitektur Komponen

### 3.1 Peran setiap direktori

```
app/layout.tsx            # Root: <html>/<body>, font (Google Fonts), @theme globals.css
app/page.tsx              # Beranda: loader data + komponen section
app/<fitur>/page.tsx      # Halaman tipis: guard + loader + view
app/<fitur>/loading.tsx   # Skeleton (shared/per halaman)
app/<fitur>/error.tsx     # Boundary galat (root + per halaman)
app/api/**/route.ts       # API: delegasi ke handlers (lib/*/handlers.ts)

components/Header.tsx     # Nav utama (named export)
components/Footer.tsx     # Footer
components/Hero.tsx       # Hero beranda (butuh BerandaData prop)
components/Sections.tsx   # Section beranda (DarkPanel, Stats, Kalender, …)
components/status.ts      # Warna status slot tunggal (STATUS)
components/icons.tsx      # Ikon tunggal (Icon + IconName)
components/auth/          # Modul fitur autentikasi
components/pembayaran/    # Modul fitur pembayaran
components/JadwalSayaView.tsx   # View jadwal pribadi
components/PembayaranView.tsx   # View halaman bayar
```

### 3.2 Arus data komponen

```
Server (page.tsx)
   └─► loader (lib/beranda.ts, lib/jadwal-data.ts, lib/pembayaran/data.ts)
        └─► DB via Prisma
   └─► View (components/JadwalSayaView, PembayaranView, …)
        └─► Primitif UI (JadwalKartu, BuktiForm, HitungMundur, …)
             └─► Global primitives (Icon, Banner, Field, TombolUtama)
```

- View menerima `pengguna` (hanya nama), `data`, `now` — tanpa data sensitif.
- Komponen client (`BuktiForm`, `MasukForm`) hanya untuk state/event; render ulang lewat `router.refresh()` setelah sukses.

---

## 4. Alur Keamanan & Otorisasi

```
Setiap endpoint tulis
   ├─► baca cookie sesi (bacaCookie)
   ├─► wajibPenyewa() / penggunaSaatIni() ──► id pengguna dari SESI (bukan request)
   ├─► validasi param (regex/Zod)
   ├─► validasi body (Zod skema)
   ├─► cek kepemilikan data (pesanan milik sesi ini → notFound() milik orang lain)
   ├─► cek status/peran di server (H-1, Menunggu pembayaran, admin)
   ├─► transaksi DB (bersyarat status lama)
   └─► JSON respons: kode mesin generik, detail ke log saja
```

- Rate limiter di `lib/auth/ratelimit.ts` pada login, daftar, kirim ulang, pesan, unggah bukti.
- Secret (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, kunci sesi) hanya di `.env`, tidak masuk repo.

---

## 5. Konvensi Penamaan & Path

| Elemen | Contoh | Aturan |
|---|---|---|
| Rute | `/jadwal-saya`, `/pesanan/{kode}/bayar` | kebab-case, Indonesia |
| Route Handler | `app/api/pesanan/{kode}/bukti/route.ts` | delegasi ke handlers |
| Loader | `getBerandaData`, `getJadwalSaya`, `getHalamanBayar` | `lib/*-data.ts` atau `lib/beranda.ts` |
| Service | `daftar`, `masuk`, `tambahPesanan` | `lib/*/service.ts` |
| Store (Prisma) | `prisma-store.ts` | `lib/*/prisma-store.ts` |
| Komponen view | `JadwalSayaView`, `PembayaranView` | `components/` |
| Komponen primitif | `Banner`, `Field`, `TombolUtama` | `components/auth/ui.tsx` |
| Ikon | `ball`, `calendar`, `kanan` | `components/icons.tsx` |
| Status slot | `tersedia`, `terisi`, `ditahan`, `tidak_tersedia` | `components/status.ts` |

---

## 6. Glosarium Istilah

| Istilah | Arti |
|---|---|
| RSC | React Server Component — komponen yang render di server, default Next.js |
| Loader | Fungsi `lib/*-data.ts` yang mengambil data dari DB untuk halaman |
| View | Komponen tampilan per halaman yang menerima props siap-tampil |
| Mode demo | `DEMO = !process.env.DATABASE_URL`: jalur baca pakai data palsu, tulis ditolak |
| Outbox | Pola menulis notifikasi ke DB dalam transaksi yang sama dengan bisnis, lalu dikirim secara terpisah |
| RSC serialization | Hanya data seriable yang boleh jadi props komponen (tanpa fungsi, class instan, dll.) |
| Hydration mismatch | Atribut HTML antara server dan klien berbeda saat re-hydrate (hindari per §10 Conventions) |
| Mode demo | `DEMO = !process.env.DATABASE_URL`: jalur baca pakai data palsu, tulis ditolak |

---

## 7. Diagram Relasi Data (singkat)

Lihat `docs/PRD.md` Bagian 7 untuk ERD lengkap. Relasi inti:

```
Pengguna ──< Pesanan >── Lapangan ──< JenisOlahraga
                 │            ├──< FotoLapangan
                 │            ├──< JamOperasional
                 │            ├──< Tarif
                 │            ├──< BlokirJadwal
                 │            └──< Lapangan_Fasilitas >── Fasilitas
                 ├──< SlotPesanan
                 ├──1 Pembayaran
                 ├──0..1 PengajuanPembatalan
                 └──< RiwayatStatus

Pengguna ──< TokenAkun
Pengguna ──< PushSubscription ──< NotifikasiPush
Pengaturan (satu baris, nama–nilai)
```
