# Gelanggang Hijau — Beranda (`/`)

Next.js 14 (App Router) + React 18 + Tailwind CSS 3 + TypeScript.

## Menjalankan
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```
Butuh **Node.js >= 22.13** (basis data memakai modul bawaan `node:sqlite`, tanpa dependensi native).

## Struktur
```
app/            layout (font lokal), page "/", globals.css (aturan STYLE.md)
  fonts/        Plus Jakarta Sans & Sora (woff2, dari berkas referensi)
components/
  home/         Header, Hero, SlotCard*, DarkPanel, Stats, CourtList*, CourtCard,
                SlotFeature, HowItWorks, CtaSection, Footer, NewsletterForm*
  ui/           Logo, Icons, CourtIllustration, ArrowButton, Heading
lib/            data.ts (lapangan, slot), routes.ts
public/         favicon.svg
```
`*` = client component (interaktif).

## Catatan
- Halaman yang dibangun: `/`, `/lapangan/[id]`, `/pesan`, `/pesanan/[kode]/bayar`, `/admin/masuk`, `/admin/verifikasi`, `/admin/lapangan`, `/admin/tarif`, `/admin/jam-operasional`, `/admin/pesanan`, `/admin/pengaturan`. Tautan ke `/masuk`, `/daftar`, `/pesan`,
  `/jadwal-saya`, `/riwayat`, `/lupa-sandi` mengikuti route di papan desain dan akan 404
  sampai halamannya dibuat.
- Token warna ada di `tailwind.config.ts` (`f0…f9`, `lime`, `line`, `muted`).

## Halaman Detail Lapangan — `/lapangan/[id]`
ID contoh: `futsal-arena-a`, `badminton-court-1`, `basket-outdoor`, `tenis-lapangan-1`, `mini-soccer`, `badminton-court-2`. ID lain → 404.

```
app/lapangan/[id]/   page.tsx (server, dynamic), loading.tsx
components/court/    CourtHeading, CourtGallery, FacilityList, LocationMap, PriceTable,
                     OperatingHours, SectionBlock, CourtFooter,
                     BookingPanel*, DateStrip*, SlotGrid*, SlotLegend, BookingSummary
lib/                 datetime (WIB), court-detail (data lapangan), availability (status slot, PRD §6),
                     selection (jam berurutan + rincian harga), mock-availability (pengganti DB),
                     booking-draft (draf pilihan), auth (status sesi), slot-status
```

### Titik integrasi
- Tombol **Pesan**: tamu → `/masuk?next=/pesan?lapangan=…&tanggal=…&jam=…`; terverifikasi → `/pesan?…`; belum verifikasi → peringatan.
  Pilihan juga disimpan di `localStorage` (`gh:booking-draft`, 2 jam).

## Halaman Pemesanan — `/pesan`
Query: `?lapangan=futsal-arena-a&tanggal=2026-11-14&jam=20,21` (divalidasi ulang di server). Tanpa query, draf dari Detail dipulihkan.
Sukses → `POST /api/pesanan` → pindah ke `/pesanan/{kode}/bayar` (halaman pembayaran belum dibangun → 404 sementara).

```
app/pesan/                page.tsx
app/api/pesanan/          POST: buat pesanan atomik
app/api/ketersediaan/     GET : status 18 slot (publik, tanpa data pemilik)
app/api/dev/login/        login DEMO (pengembangan)  ·  app/api/auth/logout/  POST keluar
components/booking/       BookingFlow*, SlotPicker*, OrderSummary, ConfirmDialog*, Banner, StepIndicator
lib/server/               db (skema+seed), repo (query), bookings (createBooking), session, pesan-data
lib/                      booking-errors, booking-types, payment-deadline (+ selection.toggleHourStrict)
tests/, scripts/          tes backend (node:test), run-tests.mjs, reset-db.mjs
```

### Basis data (SQLite, `data/gelanggang.db`)
Dibuat + di-seed otomatis saat pertama diakses: 6 lapangan, tarif, jam operasional, blacklist, 3 akun demo, dan pesanan pemain lain 60 hari ke depan.
Reset: `npm run db:reset`. Keunikan slot dijaga **indeks unik parsial** `ux_slot_aktif (lapangan_id, tanggal, jam) WHERE aktif=1`.

### Login demo (sampai /masuk dibangun)
- `/api/dev/login?as=verified&next=/pesan` — Rani Putri (terverifikasi) · `as=unverified` — Budi (belum verifikasi) · `as=lain`
- Nonaktif di produksi kecuali `ALLOW_DEV_LOGIN=1`. Di produksi wajib set `SESSION_SECRET` (lihat `.env.example`).

### Pemeriksaan
`npm test` (97 tes: aturan bisnis, harga, kedaluwarsa, anti double booking termasuk balapan antar-proses). Lalu `npm run lint` dan `npm run build`.

## Halaman Pembayaran — `/pesanan/[kode]/bayar` (frontend saja)
Data pesanan adalah **data contoh** (`lib/mock-order.ts`, mengikuti desain: Futsal Arena A, Sabtu 20.00–22.00, Rp 300.000, sisa ±23:41).
Kode apa pun yang valid dipakai sebagai kode pesanan. Unggah bukti dan pembatalan hanya **simulasi di browser** (React state);
tidak ada berkas yang dikirim/disimpan dan halaman ini tidak membaca pesanan nyata dari `/pesan`.

```
app/pesanan/[kode]/bayar/page.tsx
components/payment/   PaymentFlow*, DeadlineCard, BankCard*, ProofUploader*, PaymentSummary, CancelDialog*,
                      useCountdown, useProofFile, status
components/ui/useDialog.ts
lib/                  proof-file (validasi), payment-format, mock-order, payment-client (tiruan; titik integrasi backend)
```
Status: Menunggu pembayaran → (kirim bukti) Menunggu verifikasi · (batalkan) Dibatalkan · (waktu habis) Kedaluwarsa.
Coba kedaluwarsa cepat: `/pesanan/GH-ABC234/bayar?sisa=15` (countdown mulai dari 15 detik).

## Login Admin — `/admin/masuk` (frontend saja)
Simulasi di browser; **tidak ada autentikasi, sesi, atau cookie** yang dibuat, dan dashboard `/admin` belum dibangun (tautan "Lanjut ke panel admin" akan 404).
Akun contoh (hanya tampil di mode pengembangan): `admin@gelanggang.id` / `rahasia-admin`.
Perilaku: validasi wajib & format email → loading → sukses / "email atau kata sandi tidak cocok" → setelah 5 kali gagal, dibatasi 5 menit (hitung mundur).
Batas percobaan hanya hidup selama halaman terbuka; pembatasan sungguhan harus ada di server.

```
app/admin/masuk/page.tsx
components/admin/    AdminLoginArt, AdminLoginForm*
components/ui/       FormField (+ inputClass)
lib/admin-login.ts   validasi, akun contoh, simulateAdminLogin (titik integrasi API)
```

## Admin — Verifikasi — `/admin/verifikasi` (frontend saja)
Dua tab: **Bukti pembayaran** (pesanan Menunggu verifikasi) dan **Pembatalan** (Pengajuan pembatalan), antrean terlama dulu.
Data contoh di `lib/mock-verification.ts` (tanggal relatif terhadap hari ini). Keputusan hanya simulasi di browser; tidak ada autentikasi/otorisasi,
API, atau penyimpanan. Muat ulang halaman untuk mengembalikan data contoh.

- Bukti: **Lihat bukti** (modal) · **Setujui** (konfirmasi → Terkonfirmasi) · **Tolak** (dialog, alasan wajib → Ditolak, final).
- Pembatalan: **Setujui** (nominal refund manual opsional + catatan wajib → Dibatalkan) · **Tolak** (catatan wajib → kembali Terkonfirmasi).
- Setelah diputuskan, pesanan pindah ke "Sudah diputuskan (sesi ini)" dengan status baru; badge sidebar dan hitungan tab ikut berubah; antrean kosong menampilkan empty state.
- Coba tampilan gagal-simpan: `/admin/verifikasi?simulasi=gagal` (tiap keputusan gagal sekali, lalu berhasil saat dicoba lagi).

```
app/admin/verifikasi/page.tsx
components/admin/AdminShell.tsx            sidebar + kerangka admin (dipakai ulang untuk halaman admin lain)
components/admin/verification/             VerificationScreen*, Queue, Details, ProofReceipt, ProofModal*,
                                           PaymentDialogs*, CancelDecisionDialog*, StatusChip
components/ui/                             DialogShell*, EmptyState (+ textareaClass di FormField)
lib/                                       admin-verification (aturan), mock-verification, admin-verification-client (tiruan)
```
Tautan sidebar selain Verifikasi mengikuti rute PRD §9 dan akan 404 sampai halamannya dibangun.

## Admin — Kelola Lapangan — `/admin/lapangan` (frontend saja)
Tiga tab: **Daftar lapangan** (daftar + formulir tambah/edit), **Jenis olahraga**, **Fasilitas**. Data contoh diturunkan dari data lapangan publik
(`lib/mock-admin-courts.ts`). CRUD hanya simulasi di React state: tidak ada API, penyimpanan, autentikasi, atau unggah ke server; foto hanya dibaca di browser
(object URL) dan hilang saat halaman dimuat ulang.

- Formulir: nama, jenis olahraga, deskripsi, alamat, latitude/longitude (titik atau koma desimal), foto (banyak, pratinjau, hapus, geser, foto utama), fasilitas.
- Validasi: semua field wajib, koordinat angka dalam rentang, minimal satu foto, foto harus gambar sungguhan (JPG/PNG/WebP/GIF, dicek isi berkas). **Tidak ada batas ukuran foto.**
- Aktif/nonaktif lewat sakelar; menonaktifkan meminta konfirmasi (lapangan tidak dihapus, BR-17).
- Coba tampilan gagal-simpan: `/admin/lapangan?simulasi=gagal` (tiap aksi gagal sekali, lalu berhasil saat dicoba lagi).

```
app/admin/lapangan/page.tsx
components/admin/courts/   CourtsScreen*, CourtList, CourtEditor, PhotoManager*, PhotoThumb, NameListTab*, DeactivateDialog
components/ui/             Button, Switch
lib/                       admin-courts (aturan), image-file, mock-admin-courts, admin-courts-client (tiruan; titik integrasi)
```

## Admin — Kelola Tarif — `/admin/tarif` (frontend saja)
Pilih lapangan → dua seksi **Hari kerja (weekday)** dan **Akhir pekan (weekend)**, masing-masing dengan bilah cakupan 18 jam, daftar rentang (jam mulai, jam selesai, harga per jam),
tombol tambah/hapus, dan peringatan celah. Data contoh dari data lapangan publik (`lib/mock-tariffs.ts`); semua perubahan hanya simulasi di React state.

- Validasi langsung per baris: semua terisi, bilangan bulat, 06.00 ≤ mulai < selesai ≤ 24.00, harga > 0, **tanpa tumpang tindih** (batas bersinggungan seperti 06–12 + 12–17 diperbolehkan; 06–12 + 11–17 dan 17–22 + 18–23 ditolak). Tumpang tindih dihitung per lapangan dan per tipe hari.
- Cakupan mengikuti **jam operasional lapangan** (mis. Basket 06–22 tidak diminta bertarif sampai 24.00). Jam tanpa tarif memunculkan peringatan, sama seperti kalender publik yang menampilkannya "Tidak tersedia".
- Hapus rentang meminta konfirmasi; perubahan baru berlaku setelah **Simpan tarif**. Pindah lapangan dengan perubahan belum disimpan meminta konfirmasi.
- Pesanan yang sudah dibuat memakai harga terkunci: pesan sukses menyebut jumlahnya, dan tes memastikan mengubah tarif tidak mengubah total pesanan lama.
- Coba tampilan gagal-simpan: `/admin/tarif?simulasi=gagal` (gagal sekali per lapangan, lalu berhasil).

```
app/admin/tarif/page.tsx
components/admin/tariffs/   TariffsScreen*, TariffSection*, TariffRowEditor*, CoverageBar, DeleteTariffDialog*
lib/                        admin-tariffs (aturan), mock-tariffs, admin-tariffs-client (tiruan; titik integrasi)
```
Backend nanti wajib memvalidasi ulang aturan yang sama (tanpa tumpang tindih, harga > 0, cakupan jam operasional).

## Admin — Jam Operasional — `/admin/jam-operasional` (frontend saja)
Pilih lapangan → tujuh hari (Senin–Minggu), masing-masing dengan sakelar buka/tutup, jam buka, jam tutup (06.00–24.00), dan bilah rentang.
Data contoh dari data lapangan publik (`lib/mock-hours.ts`, sumber yang sama dengan Admin Tarif); semua perubahan hanya simulasi di React state dan baru berlaku setelah **Simpan jam operasional**.

- Validasi: jam tutup harus lebih besar dari jam buka; rentang 06.00–24.00 (jam tutup 24.00 didukung); hari tutup menonaktifkan input jam. Tombol simpan nonaktif selama ada galat.
- "Terapkan jam Senin ke semua hari" dan "Kembalikan standar" (06.00–24.00 setiap hari); "Batalkan perubahan" mengembalikan nilai tersimpan.
- Menyempitkan jam atau menutup hari meminta konfirmasi (daftar perubahan + jumlah pesanan aktif; pesanan tidak dibatalkan otomatis). Semua hari tutup memunculkan peringatan.
- Ringkasan tersimpan ditampilkan ("Senin–Jumat 06.00–24.00 · Sabtu 08.00–22.00 · Minggu tutup"). Menyimpan satu lapangan tidak mengubah lapangan lain.
- Coba tampilan gagal-simpan: `/admin/jam-operasional?simulasi=gagal` (gagal sekali per lapangan, lalu berhasil).

```
app/admin/jam-operasional/page.tsx
components/admin/hours/        HoursScreen*, DayRow*, SaveConfirmDialog*
components/admin/DiscardChangesDialog.tsx   (dipakai ulang)
lib/                           admin-hours (aturan), mock-hours, admin-hours-client (tiruan; titik integrasi)
```

## Admin — Daftar Pesanan — `/admin/pesanan` (frontend saja)
Tabel semua pesanan (kode, penyewa, lapangan, jadwal, durasi, total, status, tanggal pesan) dengan **pencarian** (kode atau nama penyewa), **filter status**
(kedelapan status PRD), pagination 6 per halaman, dan dialog detail. Pencarian dan filter berjalan bersamaan; tombol Reset dan tombol hapus kata kunci tersedia.
Data contoh (`lib/mock-orders.ts`, 17 pesanan) memakai kode/penyewa/total yang sama dengan halaman Admin Verifikasi. Hanya frontend: tanpa API, autentikasi, atau penyimpanan.

- Pencarian: kode tanpa memperhatikan huruf besar dan tanda hubung (`gh7k4m` = `GH-7K4M…`); nama tanpa memperhatikan huruf besar, spasi ganda, dan aksen.
- Keadaan: memuat (skeleton), galat + "Coba lagi", belum ada pesanan, dan tidak ada hasil (dengan tombol reset).
- Coba galat: `/admin/pesanan?simulasi=gagal` (muat pertama gagal, "Coba lagi" berhasil). Coba kosong: `/admin/pesanan?simulasi=kosong`.

```
app/admin/pesanan/page.tsx
components/admin/orders/   OrdersScreen*, OrderToolbar*, OrdersTable, OrderStatusChip, OrderDetailDialog*
components/ui/Pagination.tsx
lib/                       admin-orders (cari/filter/pagination), mock-orders, admin-orders-client (tiruan; titik integrasi)
```

## Admin — Pengaturan Global — `/admin/pengaturan` (frontend saja)
Tiga pengaturan sesuai PRD FR-ADM-10, tidak lebih: **rekening tujuan** (bank, nomor, atas nama), **batas bayar** (jam, awal 24) dan **batas pembatalan** (hari, awal 1 = H-1).
Data contoh (`lib/mock-settings.ts`) memakai rekening yang sama dengan halaman Pembayaran. Hanya frontend: tanpa API, autentikasi, atau penyimpanan.

- Validasi: bank dan atas nama wajib; nomor rekening hanya angka, 6–20 digit; batas bayar bilangan bulat 1–72 jam; batas pembatalan bilangan bulat 1–14 hari. Simpan ditolak selama ada galat.
- "Berlaku saat ini" di tiap kartu menampilkan nilai tersimpan; keterangan di bawah kolom batas waktu mengikuti angka yang diketik.
- Simpan membuka dialog konfirmasi (daftar perubahan; peringatan ekstra bila rekening berubah) → loading → banner sukses. "Batalkan perubahan" mengembalikan nilai tersimpan.
- Coba tampilan gagal-simpan: `/admin/pengaturan?simulasi=gagal` (penyimpanan pertama gagal, lalu berhasil).

```
app/admin/pengaturan/page.tsx
components/admin/settings/   SettingsScreen*, SettingsCard, SettingsConfirmDialog*
lib/                         admin-settings (validasi), mock-settings, admin-settings-client (tiruan; titik integrasi)
```
