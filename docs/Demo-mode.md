# Demo-mode.md â€” Mode Demo & Tanpa Basis Data

> `lib/demo.ts`: `DEMO = !process.env.DATABASE_URL`. Saat tidak ada basis data, jalur **baca** (beranda, jadwal, pembayaran) mengembalikan data contoh sehingga frontend tetap bisa dilihat dan diuji; **aksi tulis tetap menolak** tanpa basis data.

---

## 1. Apa yang Tersedia dalam Mode Demo

| Halaman/Fitur | Mode Demo | Sumber data |
|---|---|---|
| `/` Beranda | âœ… Tampil | `demoBeranda()` â€” 6 lapangan dummy, slot, statistik |
| `/jadwal-saya` | âœ… Tampil | `demoJadwal()` â€” 3 pesanan dummy (2 terkonfirmasi, 1 menunggu) |
| `/pesanan/{kode}/bayar` | âœ… Tampil | `demoHalamanBayar()` â€” 1 pesanan pembayaran dummy |
| `/detail-pesanan` | âœ… Tampil | Data statis (FE showcase) |
| Aksi tulis (pesan, bayar, daftar, masuk) | âŒ Ditolak | Memerlukan `DATABASE_URL` + Prisma |

## 2. Pengguna Dummy (`DEMO_PENGGUNA`)

| Field | Nilai |
|---|---|
| `id` | 1 |
| `nama` | Rani Putri |
| `email` | penyewa@contoh.id |
| `peran` | penyewa |
| `emailTerverifikasiPada` | diisi (terverifikasi) |

Dipakai oleh halaman yang butuh sesi (`jadwal-saya`, `bayar`) tanpa perlu login sebenarnya.

## 3. Pesanan Dummy (`demoJadwal`)

| Kode | Status | Tanggal | Jam | Total |
|---|---|---|---|---|
| FGO-DEMO-0001 | Terkonfirmasi | besok | 19â€“21 | Rp 180.000 |
| FGO-DEMO-0002 | Terkonfirmasi | +3 hari | 08â€“09 | Rp 90.000 |
| FGO-DEMO-0003 | Menunggu pembayaran | +2 hari | 20â€“22 | Rp 180.000 |

Kode `FGO-DEMO-0003` cocok untuk mencoba pembatalan pesanan yang belum dibayar (BR-10).

## 4. Halaman Pembayaran Dummy (`demoHalamanBayar`)

- Kode: sesuai parametri `kode` dari URL
- Status: `menunggu_pembayaran`
- Batas bayar: sekarang + 5 jam
- Lapangan: Futsal Arena A, 20.00â€“22.00, Rp 180.000
- Rekening: Bank BCA 1234 567 890, atas nama FieldGo Sport

## 5. Aturan Pengembang Mode Demo

1. **Jangan** biarkan cabang demo bocor ke perilaku tulis. Setiap loader baru wajib:
   ```ts
   if (DEMO) return demoXxx(â€¦);
   // kemudian baru jalur basis data
   ```
2. Data dummy selalu diberi komentar jelas: `// Data palsu hanya untuk mode demo`.
3. Jangan gunakan `DEMO` untuk menyembunyikan fitur yang seharusnya ada di produksi; ini hanya pengembangan tanpa DB.
4. Saat `DATABASE_URL` diisi, mode demo otomatis mati dan semua jalur pakai basis data sebenarnya.

## 6. Masuk ke Produksi (Basis Data Nyata)

1. Isi `.env`: `DATABASE_URL`, `DIRECT_URL`, `APP_URL`, dan opsional `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` untuk bukti pembayaran.
2. `npx prisma generate` â†’ `npx prisma migrate dev --name init` â†’ `npm run db:seed`.
3. `npm run dev` â€” semua jalur sekarang berbasis basis data asli; mode demo mati otomatis.
