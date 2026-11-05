# PRD: Website Penyewaan Lapangan Olahraga

| | |
|---|---|
| **Versi** | 1.2 |
| **Tanggal** | 5 November 2026 |
| **Status** | Siap masuk perancangan teknis dan implementasi |
| **Cakupan** | Seluruh fitur yang telah disepakati; tidak ada fitur tambahan |
| **Stack wajib** | Next.js, React, JavaScript, PostgreSQL (rincian di Bagian 17) |

> **Perubahan v1.1:** dokumen *Technical Requirements: Full-Stack Web Development* digabungkan ke PRD. **Dasar PRD tidak diubah**: tujuan, fitur (FR-*), aturan bisnis (BR-*), siklus pesanan, logika kalender, dan model data inti tetap sama. Penambahan berupa **Bagian 17** (persyaratan teknis) dan **Bagian 18** (pemetaan ke dokumen teknis), serta penyesuaian kecil bertanda **[v1.1]** pada Bagian 1.4, 4, 7, 8, 10, 11, 12, 13, 14, 15, dan 16.
>
> **Perubahan v1.2:** menambahkan **Bagian 19** (pembagian kerja tim tiga orang, mencakup fitur PRD dan tugas teknis Bagian 17). Tidak ada perubahan pada bagian lain.

---

## 1. Ringkasan Produk

### 1.1 Latar belakang
Penyewaan lapangan membutuhkan website agar pelanggan dapat melihat lapangan, mengecek ketersediaan, memesan, dan membayar secara daring, sementara pengelola dapat mengatur operasional dari satu panel.

### 1.2 Tujuan
1. Penyewa dapat memesan lapangan tanpa perlu menghubungi pengelola secara manual.
2. Admin dapat mengelola lapangan, tarif, jadwal, dan verifikasi pesanan dalam satu tempat.
3. Mencegah pemesanan ganda (double booking) dan sengketa pembayaran.
4. Admin memperoleh rekap sewa yang akurat per periode.

### 1.3 Metrik keberhasilan
| Metrik | Target |
|---|---|
| Double booking | 0 kejadian |
| Pesanan terkonfirmasi tanpa chat manual ke admin | ≥ 90% |
| Waktu admin memverifikasi satu bukti | < 2 menit |
| Waktu penyewa dari memilih slot sampai unggah bukti | < 3 menit (di luar proses transfer) |
| Kesesuaian rekap dengan data pesanan | 100% |

### 1.4 Di luar cakupan (tidak dibangun)
Payment gateway, aplikasi mobile native, notifikasi WhatsApp/SMS (**[v1.1]** Web Push berada di dalam cakupan sebagai persyaratan teknis, lihat Bagian 17.6), multi-admin dan peran, sistem diskon/voucher/membership, ulasan dan rating, pemesanan multi-lapangan atau multi-tanggal dalam satu pesanan, pemesanan lintas tengah malam, refund otomatis, dan fitur lain yang tidak tercantum di dokumen ini.

---

## 2. Pengguna dan Hak Akses

| Peran | Deskripsi | Akses |
|---|---|---|
| **Tamu** | Pengunjung tanpa akun | Melihat lapangan, detail, harga, kalender, filter; daftar dan masuk |
| **Penyewa** | Akun dengan email terverifikasi | Semua akses tamu + memesan, membayar, jadwal pribadi, riwayat, pembatalan |
| **Penyewa belum verifikasi** | Akun terdaftar, email belum diverifikasi | Bisa masuk, **tidak bisa memesan** |
| **Admin** | Satu akun, login terpisah | Seluruh menu pengelolaan |

---

## 3. Aturan Bisnis

| ID | Aturan |
|---|---|
| BR-01 | Satu slot (lapangan, tanggal, jam) hanya boleh dipegang satu pesanan aktif. |
| BR-02 | Hanya akun dengan email terverifikasi yang boleh memesan. |
| BR-03 | Satuan sewa 1 jam; jam yang dipilih dalam satu pesanan harus berurutan. |
| BR-04 | Satu pesanan hanya untuk satu lapangan dan satu tanggal. |
| BR-05 | Jam operasional berada dalam rentang 06.00 sampai 24.00; slot terakhir adalah 23.00 sampai 24.00. Tidak ada pesanan lintas hari. |
| BR-06 | Harga dikunci saat pesanan dibuat, per jam, dan tidak berubah meski tarif diubah kemudian. |
| BR-07 | Batas unggah bukti = **24 jam sejak pesanan dibuat atau sebelum jam main mulai, mana yang lebih dulu**. |
| BR-08 | Hitungan batas bayar berhenti begitu bukti diunggah. |
| BR-09 | Pesanan tanpa bukti sampai batas bayar menjadi Kedaluwarsa dan slot dilepas. |
| BR-10 | Penyewa boleh membatalkan langsung pesanan yang belum dibayar (tanpa form dan tanpa persetujuan admin). |
| BR-11 | Bukti yang ditolak bersifat final; penyewa harus memesan ulang. Penolakan wajib disertai alasan. |
| BR-12 | Pembatalan pesanan Terkonfirmasi hanya lewat form pengajuan, paling lambat **H-1** (sampai pukul 23.59 hari sebelum tanggal main), dan harus disetujui admin. |
| BR-13 | Kebijakan pengembalian dana belum baku: admin memutuskan dan mencatat nominal refund secara manual. |
| BR-14 | Admin diperingatkan bila blacklist bertabrakan dengan pesanan aktif; blacklist tidak otomatis membatalkan pesanan. |
| BR-15 | Slot tanpa tarif yang menutupinya tidak boleh dibuka untuk dipesan. |
| BR-16 | Rekap hanya menghitung pesanan Terkonfirmasi dan Selesai (pesanan Dibatalkan dikeluarkan). |
| BR-17 | Lapangan dan akun penyewa dinonaktifkan, bukan dihapus, agar riwayat dan rekap tetap utuh. |
| BR-18 | Pesanan yang sedang berjalan milik akun yang dinonaktifkan tetap diproses admin sampai selesai. |

---

## 4. Kebutuhan Fungsional

Prioritas seluruhnya **Wajib (Must)** karena semua fitur adalah bagian dari rencana yang disepakati. Urutan pengerjaan ada di Bagian 12.

### 4.1 Konten dan Informasi Publik

| ID | Kebutuhan |
|---|---|
| FR-PUB-01 | **Daftar lapangan**: menampilkan semua lapangan aktif dengan foto utama, nama, jenis olahraga, dan harga mulai dari. |
| FR-PUB-02 | **Filter jenis olahraga**: pilih satu jenis; daftar menyesuaikan. Ada opsi "Semua". |
| FR-PUB-03 | **Detail lapangan**: galeri foto, deskripsi, fasilitas, lokasi (alamat + peta), tabel harga per tipe hari dan rentang jam, jam operasional per hari. |
| FR-PUB-04 | **Kalender ketersediaan**: pilih tanggal, tampil 18 slot jam dengan status Tersedia, Terisi, Ditahan sementara, atau Tidak tersedia (aturan di Bagian 6). Dapat dilihat tamu. |
| FR-PUB-05 | Tombol "Pesan" untuk tamu mengarah ke login/daftar, lalu **kembali ke langkah pemesanan dengan pilihan slot tetap tersimpan**. |

### 4.2 Akun Penyewa

| ID | Kebutuhan |
|---|---|
| FR-ACC-01 | **Daftar**: nama, email (unik), kata sandi, nomor kontak. |
| FR-ACC-02 | **Verifikasi email**: tautan berisi token berlaku terbatas (disarankan 24 jam), sekali pakai. Ada tombol **kirim ulang** dengan pembatasan frekuensi. |
| FR-ACC-03 | **Masuk dan keluar**. Akun belum terverifikasi dapat masuk dengan banner pengingat, tetapi tidak dapat memesan. |
| FR-ACC-04 | **Lupa kata sandi**: tautan reset lewat email, berlaku terbatas, sekali pakai. |
| FR-ACC-05 | Akun nonaktif tidak dapat masuk; email tetap terkunci dan tidak bisa didaftarkan ulang. |

### 4.3 Pemesanan (Penyewa)

| ID | Kebutuhan |
|---|---|
| FR-ORD-01 | Penyewa memilih lapangan, tanggal, dan satu atau beberapa jam **berurutan** pada kalender. |
| FR-ORD-02 | Layar konfirmasi menampilkan lapangan, tanggal, jam, rincian harga per jam, total, dan batas bayar. |
| FR-ORD-03 | Saat dikonfirmasi, sistem memeriksa ulang ketersediaan; jika slot sudah diambil orang lain, pesanan ditolak dengan pesan jelas dan kalender dimuat ulang (BR-01). |
| FR-ORD-04 | Pesanan dibuat dengan **kode pesanan** unik yang mudah dibaca, status **Menunggu pembayaran**, harga terkunci, dan `batas_bayar_pada` terhitung. |
| FR-ORD-05 | Pesanan hanya dapat dibuat untuk tanggal dan jam yang belum lewat, serta dalam jam operasional dan tarif yang valid. |

### 4.4 Pembayaran (Penyewa)

| ID | Kebutuhan |
|---|---|
| FR-PAY-01 | Halaman pembayaran menampilkan rekening tujuan (bank, nomor, atas nama), total yang harus ditransfer, dan **hitung mundur** batas bayar. |
| FR-PAY-02 | Unggah bukti transfer: format gambar (JPG/PNG) atau PDF, ukuran maksimal ditentukan (disarankan 5 MB), validasi tipe berkas sebenarnya. |
| FR-PAY-03 | **Pratinjau bukti sebelum dikirim** beserta petunjuk singkat (nominal terlihat, nama bank dan tanggal terbaca), karena penolakan bersifat final. |
| FR-PAY-04 | Setelah dikirim, status menjadi **Menunggu verifikasi**, hitungan berhenti, dan bukti tidak dapat diganti oleh penyewa. |
| FR-PAY-05 | Penyewa dapat **membatalkan langsung** selama status Menunggu pembayaran, dengan dialog konfirmasi; status menjadi Dibatalkan dan slot langsung dilepas (BR-10). |

### 4.5 Jadwal dan Riwayat (Penyewa)

| ID | Kebutuhan |
|---|---|
| FR-HIS-01 | **Jadwal bermain**: kalender pribadi berisi pesanan Terkonfirmasi (dan yang sedang menunggu, dengan penanda status) milik penyewa. |
| FR-HIS-02 | **Riwayat**: daftar seluruh pesanan, terbaru dulu, dengan kode, lapangan, tanggal, jam, total, dan status; dapat difilter berdasarkan status. |
| FR-HIS-03 | **Detail pesanan**: rincian lengkap, status, linimasa perubahan status, bukti yang diunggah, alasan penolakan (bila ditolak), dan catatan keputusan pembatalan (bila ada). |
| FR-HIS-04 | Tombol kontekstual pada detail: **Bayar/unggah bukti** (Menunggu pembayaran), **Batalkan pesanan** (Menunggu pembayaran), **Ajukan pembatalan** (Terkonfirmasi sebelum batas H-1), **Pesan ulang** (Ditolak, Kedaluwarsa, Dibatalkan). |
| FR-HIS-05 | **Pesan ulang** membuka halaman lapangan yang sama; slot tidak dijamin kosong dan harus dipilih ulang. |

### 4.6 Pembatalan Setelah Bayar (Penyewa)

| ID | Kebutuhan |
|---|---|
| FR-CAN-01 | Tombol "Ajukan pembatalan" hanya muncul pada pesanan **Terkonfirmasi** yang tanggal mainnya masih memenuhi batas H-1; setelah lewat, tampil "Batas pembatalan telah terlewati". Validasi ulang dilakukan di sisi server. |
| FR-CAN-02 | Form: nama pemesan, kontak, kode pesanan (terisi otomatis), alasan, serta nama bank, nomor rekening, dan atas nama untuk pengembalian dana. |
| FR-CAN-03 | Setelah dikirim, status menjadi **Pengajuan pembatalan**; slot tetap terisi sampai keputusan admin. |
| FR-CAN-04 | Hanya satu pengajuan aktif per pesanan. Jika ditolak, pesanan kembali Terkonfirmasi dan pengajuan baru tidak dapat dibuat selama batas H-1 masih berlaku (satu pengajuan per pesanan). |

### 4.7 Pengelolaan Admin

| ID | Kebutuhan |
|---|---|
| FR-ADM-01 | **Login admin terpisah** dari login penyewa; satu akun admin. |
| FR-ADM-02 | **Kelola lapangan**: tambah, ubah, nonaktifkan/aktifkan lapangan; atur nama, jenis olahraga, deskripsi, alamat, koordinat peta, foto (unggah banyak, urutan, foto utama), dan fasilitas (pilih dari daftar, tambah fasilitas baru). Kelola juga daftar jenis olahraga. |
| FR-ADM-03 | **Kelola tarif**: harga per jam per lapangan berdasarkan tipe hari (weekday/weekend) dan rentang jam. Validasi: tidak boleh tumpang tindih, dan seluruh jam operasional harus tertutup tarif. Perubahan tarif tidak memengaruhi pesanan yang sudah dibuat. |
| FR-ADM-04 | **Kelola jam operasional**: jam buka dan tutup per lapangan per hari (rentang 6 sampai 24), dengan opsi hari tutup. Standar awal 06.00 sampai 24.00. |
| FR-ADM-05 | **Blacklist jadwal**: tutup rentang tanggal, sehari penuh atau rentang jam tertentu, dengan alasan. Sebelum disimpan, sistem menampilkan **peringatan dan daftar pesanan aktif yang bertabrakan**; admin memutuskan melanjutkan atau tidak. Admin dapat menghapus blacklist. |
| FR-ADM-06 | **Verifikasi pesanan, antrean bukti pembayaran**: daftar pesanan Menunggu verifikasi (terlama dulu) dengan pratinjau bukti, total, dan data penyewa. Aksi **Setujui** (jadi Terkonfirmasi) atau **Tolak** (alasan wajib, jadi Ditolak final, slot dilepas). |
| FR-ADM-07 | **Verifikasi pesanan, antrean pembatalan**: daftar Pengajuan pembatalan dengan data form. Aksi **Setujui** (jadi Dibatalkan, slot dilepas) atau **Tolak** (kembali Terkonfirmasi); wajib mengisi catatan keputusan; nominal refund diisi manual bila ada. |
| FR-ADM-08 | **Rekap sewa**: laporan pesanan Terkonfirmasi dan Selesai berdasarkan periode, dengan filter lapangan dan jenis olahraga; menampilkan jumlah pesanan, total jam, dan total pendapatan. Dapat diekspor ke CSV. |
| FR-ADM-09 | **Nonaktifkan/aktifkan akun penyewa** dengan satu tombol pada data pengguna; data pesanan tetap utuh (BR-17, BR-18). |
| FR-ADM-10 | **Pengaturan**: rekening tujuan, batas bayar (24 jam), batas pembatalan (H-1). |
| FR-ADM-11 | Admin dapat melihat daftar seluruh pesanan dengan pencarian berdasarkan kode atau nama penyewa dan filter status, sebagai dasar verifikasi dan penelusuran. |

> **Catatan efisiensi:** FR-ADM-09 sampai FR-ADM-11 adalah bagian dari fitur yang sudah disepakati (nonaktifkan akun, pengaturan global, serta tampilan pesanan sebagai dasar Verifikasi dan Rekap) dan tidak menambah menu baru di luar panel admin.

---

## 5. Siklus Hidup Pesanan

### 5.1 Status

| Status | Arti | Slot di kalender | Transisi berikutnya |
|---|---|---|---|
| Menunggu pembayaran | Dipesan, belum ada bukti | Ditahan sementara | Menunggu verifikasi, Kedaluwarsa, Dibatalkan |
| Menunggu verifikasi | Bukti diunggah, hitungan berhenti | Ditahan sementara | Terkonfirmasi, Ditolak |
| Terkonfirmasi | Disetujui admin | Terisi | Pengajuan pembatalan, Selesai |
| Pengajuan pembatalan | Form diajukan | Terisi | Dibatalkan, Terkonfirmasi |
| Ditolak | Bukti tidak valid (final) | Tersedia kembali | Akhir |
| Kedaluwarsa | Tidak ada bukti dalam batas waktu | Tersedia kembali | Akhir |
| Dibatalkan | Dibatalkan penyewa atau disetujui admin | Tersedia kembali | Akhir |
| Selesai | Jam main sudah lewat | Masuk rekap | Akhir |

### 5.2 Diagram transisi

```
                        ┌──────────────┐  batal oleh penyewa   ┌───────────┐
   [Pesan] ───────────► │  Menunggu    │ ────────────────────► │ Dibatalkan│
                        │  pembayaran  │                       └───────────┘
                        └──────┬───────┘
          lewat batas bayar    │   unggah bukti
        ┌──────────────────────┤
        ▼                      ▼
  ┌────────────┐        ┌──────────────┐   tolak (alasan)   ┌─────────┐
  │Kedaluwarsa │        │  Menunggu    │ ─────────────────► │ Ditolak │
  └────────────┘        │  verifikasi  │                    └─────────┘
                        └──────┬───────┘
                               │ setujui
                               ▼
                        ┌──────────────┐  ajukan batal (≤ H-1)  ┌────────────────┐
                        │ Terkonfirmasi│ ─────────────────────► │  Pengajuan     │
                        │              │ ◄───────────────────── │  pembatalan    │
                        └──────┬───────┘     ditolak admin      └───────┬────────┘
                               │ jam main lewat                         │ disetujui
                               ▼                                        ▼
                         ┌───────────┐                            ┌───────────┐
                         │  Selesai  │                            │ Dibatalkan│
                         └───────────┘                            └───────────┘
```

### 5.3 Perhitungan batas bayar
`batas_bayar_pada = minimum(waktu pesanan dibuat + 24 jam, jam mulai main)`

Contoh: pesanan dibuat 20.00 untuk main esok pukul 08.00, maka batas bayar adalah esok pukul 08.00 (bukan 24 jam penuh).

### 5.4 Perhitungan batas pembatalan
Pengajuan diizinkan jika waktu sekarang ≤ pukul 23.59 pada hari sebelum `tanggal_main` (H-1). Nilai "1 hari" diambil dari Pengaturan.

---

## 6. Logika Status Slot Kalender

Status **tidak disimpan**; dihitung setiap kalender dibuka agar selalu sinkron dengan data sumber. Urutan pengecekan per slot:

| Urutan | Kondisi | Hasil |
|---|---|---|
| 1 | Lapangan nonaktif, hari tutup, atau di luar jam operasional | Tidak tersedia |
| 2 | Tidak ada tarif yang menutupi jam tersebut | Tidak tersedia |
| 3 | Termasuk dalam blacklist | Tidak tersedia |
| 4 | Slot lampau (tanggal/jam sudah lewat) | Tidak tersedia |
| 5 | Ada slot aktif dari pesanan Terkonfirmasi atau Pengajuan pembatalan | Terisi |
| 6 | Ada slot aktif dari pesanan Menunggu pembayaran atau Menunggu verifikasi | Ditahan sementara |
| 7 | Selain itu | Tersedia |

Tamu dan penyewa melihat tampilan yang sama; detail pemilik pesanan **tidak** ditampilkan ke publik.

---

## 7. Model Data

### 7.1 Relasi ringkas

```
Pengguna ──< Pesanan >── Lapangan >── JenisOlahraga
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
Pengguna ──< PushSubscription                 [v1.1]
Pengguna ──< NotifikasiPush >── Pesanan       [v1.1]
Pengaturan (mandiri)
```

### 7.2 Entitas dan atribut

**JenisOlahraga**: id, nama

**Lapangan**: id, jenis_olahraga_id, nama, deskripsi, alamat, latitude, longitude, aktif

**FotoLapangan**: id, lapangan_id, berkas, urutan, foto_utama

**Fasilitas**: id, nama  |  **Lapangan_Fasilitas**: lapangan_id, fasilitas_id

**JamOperasional**: id, lapangan_id, hari (Senin–Minggu), jam_buka, jam_tutup (6–24), buka (ya/tidak). Satu baris per lapangan per hari.

**Tarif**: id, lapangan_id, tipe_hari (weekday/weekend), jam_mulai, jam_selesai (6–24), harga_per_jam

**BlokirJadwal**: id, lapangan_id, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai (kosong = sehari penuh), alasan, dibuat_pada

**Pengguna**: id, nama, email (unik), kata_sandi (hash), nomor_kontak, peran (penyewa/admin), email_terverifikasi_pada, dinonaktifkan_pada, dibuat_pada

**TokenAkun**: id, pengguna_id, jenis (verifikasi_email/reset_sandi), token (hash), kedaluwarsa_pada, digunakan_pada

**Pesanan**: id, kode_pesanan (unik), pengguna_id, lapangan_id, tanggal_main, jam_mulai, jam_selesai, jumlah_jam, total_harga (terkunci), status, batas_bayar_pada, alasan_penolakan, dibuat_pada

**SlotPesanan**: id, pesanan_id, lapangan_id, tanggal, jam (jam mulai 6–23; jam selesai = jam + 1), harga_per_jam (terkunci), aktif. **Kunci anti double booking:** kombinasi (lapangan_id, tanggal, jam) harus unik di antara baris aktif.

**Pembayaran**: id, pesanan_id (satu-ke-satu), berkas_bukti, diunggah_pada, status_verifikasi (menunggu/disetujui/ditolak), diverifikasi_oleh, diverifikasi_pada

**PengajuanPembatalan**: id, pesanan_id, nama_pemesan, kontak, alasan, nama_bank, nomor_rekening, atas_nama, diajukan_pada, status (menunggu/disetujui/ditolak), catatan_admin, nominal_refund, diputuskan_oleh, diputuskan_pada

**RiwayatStatus**: id, pesanan_id, status_lama, status_baru, diubah_oleh (kosong = sistem), waktu, catatan

**Pengaturan**: rekening_tujuan (bank, nomor, atas nama), batas_bayar_jam (24), batas_pembatalan_hari (1)

**[v1.1] PushSubscription**: id, pengguna_id, endpoint (unik), kunci_p256dh, kunci_auth, user_agent, dibuat_pada, terakhir_berhasil_pada. Satu pengguna dapat memiliki banyak perangkat.

**[v1.1] NotifikasiPush**: id, pengguna_id (penerima), pesanan_id (opsional), jenis (lihat 17.6), judul, isi, url_tujuan, status (menunggu/terkirim/gagal), jumlah_percobaan, galat_terakhir (ringkas, tanpa data sensitif), dibuat_pada, dikirim_pada. Unik per (jenis, pesanan_id, pengguna_id) untuk mencegah pengiriman ganda.

**[v1.1] Penyesuaian atribut berkas**: `FotoLapangan.berkas` dan `Pembayaran.berkas_bukti` menyimpan **kunci objek** di object storage, ditambah `tipe_berkas` dan `ukuran_berkas` sebagai metadata (lihat 17.5).

### 7.3 Aturan integritas data
- Penyimpanan jam memakai angka jam mulai (6–23) untuk menghindari nilai "24:00" yang bermasalah.
- Pembuatan Pesanan, SlotPesanan, dan RiwayatStatus dilakukan dalam **satu transaksi atomik**: gagal satu, gagal semua.
- Lapangan dan Pengguna tidak pernah dihapus fisik.
- `alasan_penolakan` wajib terisi bila status Ditolak; `catatan_admin` wajib terisi pada keputusan pembatalan.
- **[v1.1]** Seluruh aturan di atas ditegakkan juga lewat constraint basis data (PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, CHECK); rinciannya ada di matriks 17.2.
- **[v1.1]** Perubahan status memakai pembaruan bersyarat (status lama harus sesuai) agar dua aksi bersamaan tidak sama-sama berhasil (lihat 17.3).

---

## 8. Proses Otomatis (Penjadwal)

**[v1.1]** Dijalankan oleh **proses worker terpisah** sebagai pekerjaan berulang pada antrean persisten (BullMQ + Redis, lihat 17.6), disarankan setiap 5 menit; token setiap hari. Semua proses bersifat idempoten (aman dijalankan ulang):

| Proses | Kondisi | Tindakan |
|---|---|---|
| Kedaluwarsa | Status Menunggu pembayaran dan `batas_bayar_pada` terlewati | Status menjadi Kedaluwarsa, slot dinonaktifkan, catat di RiwayatStatus |
| Selesai | Status Terkonfirmasi dan jam selesai main terlewati | Status menjadi Selesai, catat di RiwayatStatus |
| Pembersihan token | Token kedaluwarsa atau sudah dipakai | Hapus |
| **[v1.1]** Penyapu notifikasi | NotifikasiPush berstatus menunggu yang belum masuk antrean | Masukkan kembali ke antrean |

**Pengaman:** kalender dan pembuatan pesanan juga memeriksa `batas_bayar_pada` secara langsung, sehingga slot yang sudah lewat batas tidak terhalang oleh keterlambatan penjadwal.

**[v1.1] Keamanan konkurensi:** proses Kedaluwarsa memakai pembaruan bersyarat (hanya bila status masih Menunggu pembayaran dan belum ada bukti), sehingga tidak bertabrakan dengan penyewa yang mengunggah bukti pada saat yang sama.

---

## 9. Peta Halaman

**Publik**
- `/` Beranda dan daftar lapangan (filter jenis olahraga)
- `/lapangan/{id}` Detail lapangan dan kalender
- `/daftar`, `/masuk`, `/verifikasi-email`, `/lupa-sandi`, `/reset-sandi`

**Penyewa**
- `/pesan` Pemilihan slot dan konfirmasi
- `/pesanan/{kode}/bayar` Pembayaran dan unggah bukti
- `/jadwal-saya` Kalender pribadi
- `/riwayat` dan `/riwayat/{kode}` Riwayat, detail, tombol aksi
- `/riwayat/{kode}/batal` Form pengajuan pembatalan

**Admin** (`/admin/...`)
- `masuk`, `lapangan`, `tarif`, `jam-operasional`, `blacklist`
- `verifikasi` (tab: Bukti pembayaran, Pembatalan)
- `pesanan`, `rekap`, `pengguna`, `pengaturan`

---

## 10. Kebutuhan Non-Fungsional

### 10.1 Keamanan
- Kata sandi disimpan sebagai hash; token verifikasi/reset disimpan sebagai hash.
- HTTPS wajib; sesi aman dengan masa berlaku.
- Akses dicek di **server** untuk setiap aksi (kepemilikan pesanan, peran admin, status, batas H-1), tidak hanya disembunyikan di tampilan.
- Pembatasan percobaan login dan permintaan kirim ulang verifikasi/reset.
- Berkas bukti dan foto: validasi tipe dan ukuran, nama file diacak, **bukti pembayaran hanya dapat diakses pemilik pesanan dan admin** (tidak publik). **[v1.1]** Disimpan di object storage (17.5).
- Perlindungan standar terhadap CSRF, XSS, dan injeksi.
- Data pribadi (kontak, rekening pengembalian) hanya terlihat oleh pemilik dan admin.
- **[v1.1]** Standar keamanan teknis lengkap (otorisasi di server, rate limiting, pengelolaan secret, pesan error aman): Bagian 17.4.

### 10.2 Kinerja dan keandalan
- Halaman publik dimuat < 3 detik pada koneksi seluler umum; foto dikompres dan dimuat bertahap.
- Kalender satu lapangan satu hari dihitung dengan satu kueri gabungan, bukan per slot.
- Pembuatan pesanan menangani permintaan bersamaan tanpa double booking (BR-01).
- Cadangan basis data otomatis harian dan berkas bukti ikut dicadangkan.

### 10.3 Kegunaan
- Desain responsif, mobile-first (mayoritas penyewa memakai ponsel).
- Seluruh antarmuka berbahasa Indonesia; tanggal, jam, dan mata uang dalam format Indonesia (WIB, Rupiah).
- Status pesanan memakai label dan warna konsisten.
- Pesan kesalahan jelas dan menyebut tindakan perbaikan.

### 10.4 Zona waktu
Seluruh perhitungan (jam main, batas bayar, H-1, kedaluwarsa) memakai satu zona waktu tetap, **WIB (Asia/Jakarta)**, untuk menghindari selisih.

### 10.5 Email transaksional
Hanya dua jenis: verifikasi email dan reset kata sandi. Tidak ada email promosi atau notifikasi lain. **[v1.1]** Notifikasi Web Push adalah kanal terpisah dan tidak menggantikan email (17.6).

---

## 11. Pendekatan Efisiensi

Prinsip: bangun sekecil mungkin yang masih memenuhi seluruh fitur.

| Keputusan | Alasan efisiensi |
|---|---|
| Satu aplikasi web terpadu (monolit) dalam satu repositori, **[v1.1]** ditambah satu proses worker, dan satu basis data relasional | Tanpa layanan terpisah; konsistensi transaksi mudah untuk anti double booking |
| Satu tabel Pengguna dengan kolom peran | Admin hanya satu; tanpa manajemen peran |
| Status kalender dihitung, tidak disimpan | Tidak ada risiko data tidak sinkron |
| Keunikan slot di tingkat basis data | Anti double booking tidak bergantung pada tampilan |
| Transfer manual, tanpa payment gateway | Tanpa integrasi dan biaya transaksi |
| **[v1.1]** Satu worker (BullMQ + Redis) untuk pengiriman Web Push dan proses otomatis berkala | Satu infrastruktur antrean dipakai bersama, bukan dua mekanisme terpisah |
| Pengaturan global berupa pasangan nama–nilai | 24 jam dan H-1 dapat diubah tanpa mengubah rancangan |
| Peta memakai embed pihak ketiga dari koordinat | Tanpa membangun fitur peta sendiri |
| **[v1.1]** Object storage dengan satu pola unggah (lewat backend) | Validasi tipe dan ukuran terpusat di server; bukti tetap privat |
| Komponen kalender dan form dipakai ulang | Kalender publik, kalender pribadi, dan pemilih slot berbagi satu komponen |
| **[v1.1]** Satu skema Zod per operasi, dipakai frontend dan backend | Aturan validasi tidak ditulis dua kali dan tidak bisa berbeda |
| **[v1.1]** Docker Compose untuk PostgreSQL, Redis, dan MinIO di lokal | Anggota tim menyalakan seluruh lingkungan dengan satu perintah |

---

## 12. Tahapan Pengerjaan

| Tahap | Cakupan | Fitur terkait | Hasil yang dapat diuji |
|---|---|---|---|
| **1. Fondasi data** | Struktur basis data, login admin, kelola lapangan, jam operasional, tarif, pengaturan | FR-ADM-01 sampai 04, 10 | Admin dapat menyiapkan data lapangan lengkap |
| **2. Informasi publik** | Daftar, filter, detail, foto, fasilitas, lokasi, harga | FR-PUB-01 sampai 03 | Tamu dapat menjelajah lapangan |
| **3. Ketersediaan** | Kalender, blacklist dengan peringatan bentrok | FR-PUB-04, FR-ADM-05 | Kalender menampilkan status benar |
| **4. Akun dan transaksi** | Daftar, verifikasi email, pemesanan, pembayaran, verifikasi bukti, penjadwal kedaluwarsa | FR-ACC, FR-ORD, FR-PAY, FR-ADM-06, FR-PUB-05 | Satu pesanan dapat dari awal sampai Terkonfirmasi |
| **5. Pasca-transaksi** | Jadwal pribadi, riwayat, pembatalan, pesan ulang, rekap, daftar pesanan, kelola akun, status Selesai | FR-HIS, FR-CAN, FR-ADM-07 sampai 09, 11 | Seluruh siklus pesanan dan pelaporan berjalan |

**[v1.1] Tambahan teknis per tahap** (tidak mengubah cakupan fitur di atas):

| Tahap | Tambahan teknis |
|---|---|
| **1** | Repositori Git, ESLint, Docker Compose, skema dan migrasi lengkap dengan constraint (17.2), seed awal, `.env.example`, logging Pino dan Sentry dasar, object storage untuk foto, rate limiter dasar |
| **2** | Pagination daftar lapangan, penghindaran N+1 pada daftar (foto utama dan harga mulai dari) |
| **3** | Kalender dengan satu kueri gabungan dan tanpa cache lintas pengguna |
| **4** | Kunci VAPID, Service Worker, tabel PushSubscription dan NotifikasiPush, proses worker, kejadian Push 1 sampai 3 (17.6), unggah bukti ke storage privat, rate limiting endpoint sensitif |
| **5** | Kejadian Push 4 sampai 6, pagination riwayat, daftar pesanan admin, dan rekap; pengujian sembilan cakupan (17.10); ERD, dokumentasi arsitektur, daftar fitur selesai dan keterbatasan |

Tahap berikutnya hanya dimulai bila kriteria penerimaan tahap sebelumnya terpenuhi.

---

## 13. Kriteria Penerimaan Utama

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| AC-01 | Dua penyewa memesan slot yang sama bersamaan | Hanya satu berhasil; yang lain mendapat pesan slot sudah terisi |
| AC-02 | Tamu menekan "Pesan", lalu login | Kembali ke langkah pemesanan dengan slot terpilih |
| AC-03 | Akun belum terverifikasi mencoba memesan | Ditolak dengan petunjuk verifikasi email |
| AC-04 | Memilih jam 09.00 dan 11.00 tanpa 10.00 | Ditolak (jam harus berurutan) |
| AC-05 | Pesanan melewati dua tarif (misalnya 17.00 dan 18.00) | Total = jumlah harga per jam masing-masing |
| AC-06 | Admin mengubah tarif setelah pesanan dibuat | Total pesanan lama tidak berubah |
| AC-07 | Pesanan dibuat 20.00 untuk main esok 08.00 | Batas bayar esok 08.00 |
| AC-08 | Bukti diunggah, lalu 24 jam berlalu tanpa verifikasi | Pesanan tidak kedaluwarsa |
| AC-09 | Tidak ada bukti sampai batas bayar | Status Kedaluwarsa, slot kembali Tersedia |
| AC-10 | Penyewa membatalkan pesanan yang belum dibayar | Status Dibatalkan seketika, slot tersedia, tanpa antrean admin |
| AC-11 | Admin menolak bukti tanpa alasan | Sistem menolak aksi; alasan wajib |
| AC-12 | Bukti ditolak | Tidak ada tombol unggah ulang; ada tombol "Pesan ulang" |
| AC-13 | Mengajukan pembatalan pada hari H atau setelah H-1 | Tombol tidak muncul; permintaan langsung ke server juga ditolak |
| AC-14 | Pengajuan pembatalan ditolak admin | Pesanan kembali Terkonfirmasi, slot tetap Terisi |
| AC-15 | Admin memblacklist jam yang sudah dipesan | Peringatan dengan daftar pesanan bentrok; pesanan tidak otomatis batal |
| AC-16 | Rekap periode tertentu | Hanya Terkonfirmasi dan Selesai; Dibatalkan, Ditolak, Kedaluwarsa tidak terhitung |
| AC-17 | Admin menonaktifkan akun penyewa | Tidak bisa login; pesanan lama tetap ada di rekap dan dapat diproses admin |
| AC-18 | Penyewa lain mengakses bukti pembayaran milik orang lain | Akses ditolak |
| AC-19 | Slot 23.00 sampai 24.00 | Dapat dipesan; menjadi Selesai setelah pukul 24.00 |
| AC-20 | Tarif tidak menutupi seluruh jam operasional | Jam tanpa tarif tampil Tidak tersedia dan admin mendapat peringatan saat menyimpan |
| AC-21 **[v1.1]** | Request langsung ke endpoint pesanan dengan harga, total, status, atau `pengguna_id` dari client | Nilai tersebut diabaikan; harga dihitung server dan identitas diambil dari sesi |
| AC-22 **[v1.1]** | Menyisipkan langsung ke basis data: slot duplikat, jam 25, status tidak valid, harga negatif | Ditolak oleh constraint basis data |
| AC-23 **[v1.1]** | Penyewa A membuka detail atau bukti pesanan penyewa B; atau memakai tautan bukti yang sudah kedaluwarsa | Ditolak |
| AC-24 **[v1.1]** | Penyewa mengunggah bukti | Admin menerima Web Push; klik membuka antrean verifikasi bukti |
| AC-25 **[v1.1]** | Worker dimatikan, lalu bukti diunggah | Pesanan tetap berhasil; notifikasi terkirim setelah worker hidup kembali |
| AC-26 **[v1.1]** | Subscription tidak valid (misalnya endpoint kedaluwarsa) | Subscription dihapus tanpa percobaan ulang tak berujung; pesanan tidak terpengaruh |
| AC-27 **[v1.1]** | Pekerjaan pengiriman gagal berulang | Percobaan ulang terbatas, status Gagal tercatat, error muncul di log dan monitoring |
| AC-28 **[v1.1]** | Izin notifikasi ditolak atau browser tidak mendukung | Aplikasi tetap berfungsi penuh; pesan dan petunjuk jelas |
| AC-29 **[v1.1]** | Admin menyetujui dan proses kedaluwarsa berjalan bersamaan pada pesanan yang sama | Hanya satu transisi berlaku; status konsisten |
| AC-30 **[v1.1]** | Lingkungan baru mengikuti README | Web, worker, PostgreSQL, Redis, dan storage berjalan; migrasi dan seed berhasil |
| AC-31 **[v1.1]** | Percobaan login berulang dalam waktu singkat | Dibatasi (rate limiting) |
| AC-32 **[v1.1]** | Riwayat, daftar pesanan admin, dan rekap dengan data banyak | Pagination berfungsi tanpa memuat seluruh data |

---

## 14. Asumsi, Risiko, dan Mitigasi

### 14.1 Asumsi
1. Jam standar 06.00 sampai 24.00 berlaku untuk semua lapangan; penyimpangan diatur lewat Kelola jam operasional.
2. Aturan batas bayar "24 jam atau sebelum jam main, mana yang lebih dulu" berlaku.
3. Token verifikasi dan reset berlaku 24 jam (dapat diubah).
4. Satu pengajuan pembatalan per pesanan.
5. Peta memakai layanan embed pihak ketiga.
6. **[v1.1]** Akses data memakai Prisma, dengan constraint lanjutan (indeks unik parsial, CHECK) ditulis lewat berkas SQL migrasi.
7. **[v1.1]** Semua aksi tulis memakai Route Handlers agar setiap aksi punya endpoint yang dapat diuji langsung tanpa frontend.
8. **[v1.1]** Unggah berkas lewat backend; unduh bukti memakai URL bertanda tangan berumur pendek (disarankan 5 menit) setelah pengecekan hak akses.
9. **[v1.1]** Enam kejadian bisnis pemicu Web Push (17.6) cukup memenuhi kewajiban notifikasi tanpa menambah fitur baru.

### 14.2 Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Bukti ditolak karena salah unggah, bukan penipuan, lalu pesanan hangus | Penyewa kesal | Pratinjau dan petunjuk sebelum kirim; alasan penolakan jelas |
| Admin tunggal terlambat memverifikasi | Slot tertahan lama, penyewa cemas | Hitungan berhenti setelah bukti; antrean terurut terlama dulu |
| Slot terkunci 24 jam oleh penyewa tidak serius | Pendapatan hilang | Batas bayar dibatasi jam main; penyewa dapat membatalkan langsung |
| Kebijakan refund belum baku | Keputusan tidak konsisten | Catatan dan nominal manual; dapat dibakukan tanpa mengubah alur |
| Bukti transfer palsu atau diedit | Kerugian finansial | Admin wajib mencocokkan dengan mutasi rekening sebelum menyetujui |
| Penjadwal terlambat atau mati | Status tidak diperbarui | Pengecekan langsung `batas_bayar_pada` di kalender dan pemesanan |
| Kehilangan data | Pesanan dan bukti hilang | Cadangan harian basis data dan berkas |
| Pembatalan oleh lapangan (hujan, kerusakan) pada pesanan terkonfirmasi | Belum ada alurnya | Di luar cakupan; ditangani manual oleh admin lewat Pengajuan pembatalan/catatan |
| **[v1.1]** Web Push di iOS Safari hanya bekerja bila situs dipasang ke layar utama | Sebagian penyewa tidak menerima notifikasi | Push sebagai pelengkap; status selalu terlihat di Riwayat dan admin tetap bisa dihubungi |
| **[v1.1]** Redis atau worker mati | Notifikasi dan proses otomatis tertunda | Pengecekan langsung `batas_bayar_pada`; penyapu notifikasi; antrean persisten; log dan Sentry |
| **[v1.1]** Beban teknis (worker, Redis, object storage) berat bagi anggota pemula | Jadwal mundur | Fondasi dan worker dipegang anggota paling berpengalaman; Docker Compose; pola unggah dan skema validasi dibuat satu kali sebagai contoh |
| **[v1.1]** Dokumen teknis saling bertentangan soal bahasa (JavaScript vs TypeScript) | Salah arah implementasi | Diklarifikasi (Bagian 15, nomor 5); sementara JavaScript |

---

## 15. Pertanyaan Terbuka

| # | Pertanyaan | Status sementara |
|---|---|---|
| 1 | Kebijakan pengembalian dana (penuh, sebagian, tidak ada) | Manual oleh admin |
| 2 | Ukuran maksimal bukti dan masa berlaku token | Disarankan 5 MB dan 24 jam |
| 3 | Apakah ada lapangan dengan jam operasional berbeda dari standar | Diatur per lapangan lewat admin |
| 4 | Penyedia peta dan layanan pengiriman email | Ditentukan saat perancangan teknis |
| 5 **[v1.1]** | Dokumen teknis menyebut JavaScript sebagai teknologi wajib (Bagian 1) tetapi juga "gunakan TypeScript" (Bagian 8). Mana yang berlaku? Dokumen sendiri meminta klarifikasi bila requirement bertentangan | Sementara JavaScript, dengan skema Zod dan JSDoc; migrasi ke TypeScript dimungkinkan bila disetujui |
| 6 **[v1.1]** | Pilihan layanan object storage (R2, S3, atau MinIO) dan tempat hosting Redis serta worker | Sementara MinIO untuk lokal; layanan produksi ditentukan saat deployment |

---

## 16. Daftar Fitur (Pemetaan ke Brief Awal)

| Brief awal | Dipenuhi oleh |
|---|---|
| Foto | FR-PUB-03, FR-ADM-02 |
| Fasilitas | FR-PUB-03, FR-ADM-02 |
| Lokasi | FR-PUB-03, FR-ADM-02 |
| Harga | FR-PUB-03, FR-ADM-03 |
| Kalender pemesanan | FR-PUB-04 |
| Filter jenis lapangan olahraga | FR-PUB-02 |
| Pemesanan lapangan | FR-ORD-01 sampai 05 |
| Jadwal bermain (kalender) | FR-HIS-01 |
| Pembayaran | FR-PAY-01 sampai 05 |
| Riwayat | FR-HIS-02 sampai 05 |
| Kelola lapangan | FR-ADM-02 |
| Kelola tarif | FR-ADM-03 |
| Kelola jam operasional | FR-ADM-04 |
| Blacklist jadwal | FR-ADM-05 |
| Verifikasi pesanan | FR-ADM-06, FR-ADM-07 |
| Rekap sewa | FR-ADM-08 |
| Rincian hasil keputusan: akun, verifikasi email | FR-ACC-01 sampai 05 |
| Rincian hasil keputusan: pembatalan | FR-PAY-05, FR-CAN-01 sampai 04 |
| Rincian hasil keputusan: nonaktifkan akun, pengaturan | FR-ADM-09, FR-ADM-10 |
| Proses otomatis dan pendukung teknis | Bagian 8 dan 7.2 (RiwayatStatus, Pengaturan, keunikan slot) |
| **[v1.1]** Web Push (persyaratan teknis) | Bagian 17.6, entitas PushSubscription dan NotifikasiPush, AC-24 sampai AC-28 |
| **[v1.1]** Unggah berkas dan object storage | Bagian 17.5, FR-ADM-02, FR-PAY-02 |

---

## 17. Persyaratan Teknis dan Standar Implementasi **[v1.1]**

Bagian ini berasal dari dokumen *Technical Requirements: Full-Stack Web Development*. Perilaku bisnis tetap ditentukan Bagian 1 sampai 16; bagian ini menentukan **cara membangunnya**. Jika ada pertentangan antara dokumen teknis dan kebutuhan fitur, kebutuhan fitur yang diikuti, kecuali dokumen teknis menyatakan wajib.

### 17.1 Teknologi

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Frontend dan backend | Next.js, React, JavaScript | Backend dibuat sendiri; **dilarang** memakai PostgREST atau layanan pengganti backend |
| API | Route Handlers (disarankan) | Setiap aksi punya endpoint yang bisa diuji langsung tanpa frontend. Server Actions boleh untuk form sederhana dengan validasi yang sama |
| Basis data | PostgreSQL | Migrasi wajib agar basis data dapat dibuat ulang |
| Akses data | Prisma (disarankan; Drizzle atau `pg` diperbolehkan) | Constraint lanjutan ditulis lewat berkas SQL migrasi |
| Validasi | Zod | Satu skema dipakai frontend dan backend |
| Versi kode | Git | Satu repositori berisi aplikasi web dan worker |
| Web Push | Service Worker, VAPID, pustaka `web-push` | Lihat 17.6 |
| Background worker | Proses terpisah, BullMQ + Redis | Antrean persisten |
| Object storage | Cloudflare R2, Amazon S3, atau MinIO | MinIO untuk lokal |
| Logging dan monitoring | Pino, Sentry (atau setara) | Lihat 17.7 |
| Lingkungan lokal | Docker Compose: PostgreSQL, Redis, MinIO | Rekomendasi efisiensi |

### 17.2 Validasi Tiga Lapisan

Setiap operasi berikut divalidasi di **ketiga lapisan secara independen**: lapisan lain boleh dilewati tanpa membuat data tidak valid masuk.

| Aturan | Frontend | Backend | Basis data |
|---|---|---|---|
| Registrasi: email dan data wajib | Format, wajib, panjang | Skema Zod, cek email belum dipakai, hash kata sandi | NOT NULL; UNIQUE(email) |
| Jam operasional (BR-05) | Input dibatasi 6 sampai 24, buka lebih awal dari tutup | Skema Zod, cek kepemilikan admin | CHECK jam 6 sampai 24 dan buka < tutup; UNIQUE(lapangan, hari) |
| Tarif (BR-15, FR-ADM-03) | Harga lebih dari 0, rentang jam masuk akal | Cek tidak tumpang tindih dan menutupi jam operasional | CHECK harga > 0 dan jam 6 sampai 24; constraint pengecualian (exclusion) untuk tumpang tindih bila memungkinkan, atau pengecekan dalam transaksi |
| Pilihan slot (BR-01, BR-03) | Hanya jam berurutan yang bisa dipilih; jam lampau dinonaktifkan | Validasi ulang urutan, jam operasional, tarif, blacklist; **harga dihitung server** | UNIQUE parsial (lapangan, tanggal, jam) pada slot aktif; CHECK jam 6 sampai 23 |
| Transisi status | Tombol hanya sesuai status | Tabel transisi sah, kepemilikan, dan peran diperiksa di server | CHECK/enum daftar status; pembaruan bersyarat |
| Penolakan bukti (BR-11) | Alasan wajib | Alasan wajib saat menolak | CHECK status Ditolak mensyaratkan alasan terisi |
| Unggah bukti (FR-PAY-02) | Ekstensi, ukuran, pratinjau | Tipe berkas sebenarnya, ukuran, pemilik, status, belum lewat batas bayar | UNIQUE(pesanan_id) pada Pembayaran; NOT NULL; FOREIGN KEY |
| Pengajuan pembatalan (BR-12) | Tombol hilang setelah H-1; form wajib terisi | Hitung H-1 di server; status harus Terkonfirmasi; kepemilikan; satu pengajuan | UNIQUE(pesanan_id) pada PengajuanPembatalan; FOREIGN KEY |
| Blacklist (FR-ADM-05) | Tanggal selesai tidak sebelum mulai | Cek bentrok dengan pesanan aktif | CHECK rentang tanggal dan jam |
| Identitas, peran, harga, saldo | Tidak dikirim client | Diambil dari sesi dan basis data, **bukan** dari isi request | FOREIGN KEY dan NOT NULL pada pemilik; total_harga NOT NULL dan tidak negatif |

### 17.3 Integritas Data, Konkurensi, dan Kinerja Kueri

- **Migrasi**: seluruh skema dibuat dari berkas migrasi; basis data kosong harus dapat dibangun ulang sampai siap pakai.
- **Seed**: hanya untuk data awal (akun admin, jenis olahraga, fasilitas awal, pengaturan). Seed tidak menggantikan fitur yang memakai data persisten.
- **Transaksi atomik** untuk operasi multi-langkah: pembuatan pesanan (Pesanan, SlotPesanan, RiwayatStatus, NotifikasiPush), persetujuan bukti, keputusan pembatalan, dan kedaluwarsa.
- **Race condition**: pesanan bersamaan pada slot sama ditangani keunikan parsial di basis data; pelanggaran ditangkap dan diubah menjadi pesan "slot sudah terisi". Perubahan status memakai pembaruan bersyarat (misalnya hanya bila status masih Menunggu pembayaran), sehingga aksi bersamaan seperti "unggah bukti vs kedaluwarsa", "setujui vs kedaluwarsa", dan "batal vs unggah bukti" tidak sama-sama berhasil.
- **Indeks** (berdasarkan kueri utama): SlotPesanan(lapangan, tanggal); Pesanan(pengguna, dibuat_pada); Pesanan(status, batas_bayar_pada); Pesanan(tanggal_main); JamOperasional dan Tarif per lapangan; BlokirJadwal(lapangan, tanggal_mulai, tanggal_selesai); PushSubscription(pengguna); NotifikasiPush(status).
- **Pagination**: daftar lapangan, riwayat penyewa, daftar pesanan admin, antrean verifikasi, dan tabel rinci rekap.
- **Hindari N+1**: kalender dihitung dengan satu kueri gabungan; daftar lapangan mengambil foto utama dan harga mulai dari lewat join atau agregasi, bukan per lapangan.
- Seluruh kueri terparameterisasi (melalui ORM).

### 17.4 Autentikasi dan Keamanan

- Sesi berbasis cookie `httpOnly`, `secure`, dan `sameSite`.
- Kata sandi di-hash dengan algoritma yang sesuai (argon2id atau bcrypt).
- **Otorisasi di server pada setiap endpoint**: login, email terverifikasi, peran, kepemilikan data, dan status pesanan.
- Server **tidak mempercayai** peran, harga, total, status, batas bayar, atau identitas pemilik dari client.
- **Rate limiting** (disimpan di Redis) pada: login, daftar, kirim ulang verifikasi, lupa kata sandi, pembuatan pesanan, unggah bukti, dan pengambilan tautan bukti.
- Pesan lupa kata sandi tidak mengungkap apakah email terdaftar.
- Secret (kredensial basis data, kunci privat VAPID, kredensial storage, rahasia sesi) hanya di variabel lingkungan server; tidak masuk repositori maupun browser. Repositori menyediakan `.env.example` tanpa nilai asli.
- Respons error ke client bersifat umum dan tidak membocorkan detail internal; detail ada di log.

### 17.5 Unggah Berkas dan Object Storage

| Jenis | Bucket | Akses |
|---|---|---|
| Foto lapangan | Publik | Dapat dilihat siapa pun; diunggah hanya oleh admin |
| Bukti pembayaran | **Privat** | Hanya pemilik pesanan dan admin |

- Unggah **lewat backend**: server memeriksa tipe berkas sebenarnya, ukuran (disarankan maksimal 5 MB), dan hak akses sebelum menyimpan ke storage dengan nama acak.
- Basis data hanya menyimpan metadata dan kunci objek, bukan berkas.
- Bukti ditampilkan melalui **URL bertanda tangan berumur pendek** yang dibuat backend setelah pengecekan hak akses.
- Kredensial storage tidak pernah dikirim ke client.

### 17.6 Web Push dan Background Worker

Web Push wajib dan **nyata** (bukan toast atau alert). Notifikasi hanya mengabarkan kejadian bisnis yang sudah ada di PRD, sehingga **tidak menambah fitur baru**.

**Kejadian pemicu**

| # | Kejadian | Penerima | Tujuan saat diklik |
|---|---|---|---|
| 1 | Bukti diunggah (Menunggu verifikasi) | Admin | Verifikasi, antrean bukti pembayaran |
| 2 | Pesanan disetujui (Terkonfirmasi) | Penyewa | Detail pesanan di Riwayat |
| 3 | Bukti ditolak | Penyewa | Detail pesanan (alasan penolakan) |
| 4 | Pengajuan pembatalan masuk | Admin | Verifikasi, antrean pembatalan |
| 5 | Keputusan pembatalan (disetujui/ditolak) | Penyewa | Detail pesanan di Riwayat |
| 6 | Pesanan kedaluwarsa | Penyewa | Detail pesanan di Riwayat |

Kejadian 1 sampai 3 dibangun lebih dulu; kejadian 4 sampai 6 memakai jalur yang sama. Isi notifikasi tidak memuat data sensitif (nomor rekening, data pribadi).

**Sisi browser**
- Tombol **"Aktifkan notifikasi"** (interaksi pengguna) di panel admin dan halaman Jadwal/Riwayat penyewa; izin tidak diminta otomatis.
- Service Worker menangani event `push` (menampilkan notifikasi) dan `notificationclick` (membuka atau memfokuskan halaman tujuan).
- Kondisi ditangani: browser tidak mendukung (tombol disembunyikan, ada keterangan), izin ditolak (petunjuk mengubah izin), subscription hilang atau tidak valid (daftar ulang saat aplikasi dibuka).
- Subscription disimpan per perangkat; keluar dari akun atau menonaktifkan notifikasi menghapusnya.

**Alur minimum:** kejadian bisnis → basis data → antrean → worker → Web Push → Service Worker → notifikasi di browser.

1. Dalam **transaksi yang sama** dengan perubahan status, sistem menulis baris NotifikasiPush berstatus *menunggu* (pola outbox).
2. Setelah transaksi berhasil, pekerjaan dimasukkan ke antrean BullMQ dengan pengenal pekerjaan tetap (mencegah pengiriman ganda).
3. Worker mengirim ke semua subscription penerima memakai VAPID dan `web-push`, lalu memperbarui status menjadi *terkirim* atau *gagal*.
4. **Kegagalan notifikasi tidak pernah membatalkan transaksi bisnis** yang sudah tersimpan.

**Penanganan kegagalan**
- Percobaan ulang terbatas (disarankan 3 sampai 5 kali) dengan jeda bertambah.
- Respons "subscription tidak ada/sudah tidak berlaku" (HTTP 404 atau 410): subscription dihapus, tanpa percobaan ulang.
- Kesalahan sementara (HTTP 429 atau 5xx): dicoba ulang. Kesalahan permanen lain: status *gagal* dengan ringkasan galat.
- Penyapu notifikasi (Bagian 8) memasukkan kembali baris *menunggu* yang gagal masuk antrean.

**Worker**
- Dijalankan sebagai **proses terpisah** dari repositori yang sama (perintah dijelaskan di README).
- Memproses dua hal: pengiriman Web Push dan pekerjaan berulang (kedaluwarsa, selesai, pembersihan token, penyapu notifikasi).
- Pasangan kunci **VAPID** dibuat sekali; kunci publik dibagikan ke browser, **kunci privat hanya ada di server dan worker**.
- Deployment wajib **HTTPS** (lokal diperbolehkan karena secure context browser).

### 17.7 Penanganan Error dan Observabilitas

- **Log terstruktur (Pino)** dengan konteks: waktu, level, request id, pengguna_id, kode pesanan, durasi operasi, nama dan id pekerjaan worker, status.
- **Dilarang dicatat**: kata sandi, token, kunci privat, isi bukti, nomor rekening lengkap, cookie.
- **Sentry** (atau setara) pada aplikasi web dan worker.
- Worker tidak boleh gagal diam-diam: mulai, selesai, gagal, durasi, dan percobaan dicatat; kegagalan juga tampil di status NotifikasiPush dan di monitoring.
- Cara menunjukkan: menelusuri satu error lewat request id di log; memeriksa pekerjaan gagal lewat NotifikasiPush berstatus *gagal* dan inspeksi antrean (alat seperti Bull Board hanya untuk pengembangan, bukan untuk pengguna).
- Metrics dan tracing terdistribusi tidak wajib untuk skala proyek ini.

### 17.8 Kualitas Kode dan Antarmuka

- **Bahasa**: JavaScript sesuai ketentuan wajib; tipe data dijaga lewat skema Zod dan JSDoc. (Lihat pertanyaan terbuka nomor 5 mengenai TypeScript.)
- Tidak ada data dummy atau hardcode sebagai pengganti fitur.
- Setiap halaman berdata punya keadaan **loading, kosong, berhasil, dan galat** (daftar lapangan, kalender, riwayat, antrean verifikasi, rekap).
- Responsif; alur utama dapat dipakai dengan keyboard (kalender slot, form, dialog konfirmasi) dengan label dan fokus yang jelas.
- **Caching sadar konsistensi**: kalender ketersediaan tidak di-cache lintas pengguna; data yang jarang berubah (jenis olahraga, fasilitas, detail lapangan) boleh di-cache singkat dan dibersihkan saat admin mengubahnya.
- ESLint dan CI sederhana (GitHub Actions: lint, build, tes) sebagai praktik terbaik.
- Tidak menambah pustaka atau lapisan abstraksi yang tidak memberi manfaat nyata.

### 17.9 Deployment dan Dokumentasi

Repositori wajib berisi:

1. Kode sumber dan riwayat Git yang wajar.
2. README: instalasi dan cara menjalankan web dan worker.
3. `.env.example` tanpa secret asli.
4. Berkas migrasi, seed, dan petunjuk inisialisasi basis data.
5. **ERD** atau dokumentasi skema (bersumber dari Bagian 7).
6. Dokumentasi arsitektur: frontend, backend, basis data, worker, dan storage.
7. Petunjuk pembuatan kunci VAPID dan menjalankan worker.
8. Daftar fitur yang selesai dan keterbatasan yang masih ada.

Aplikasi dan worker harus dapat dijalankan di lingkungan baru hanya dengan mengikuti dokumentasi.

### 17.10 Pengujian dan Bukti Verifikasi

Screenshot saja tidak cukup; setiap cakupan didemonstrasikan dan dapat dijelaskan implementasinya.

| # | Cakupan minimum | Cara menunjukkan pada proyek ini | AC |
|---|---|---|---|
| 1 | Validasi input frontend | Kirim form daftar, tarif, dan jam operasional dengan data kosong atau salah format | (tiap form) |
| 2 | Validasi backend tanpa frontend | Kirim request langsung: harga dari client, jam tidak berurutan, pembatalan lewat H-1 | AC-04, AC-13, AC-21 |
| 3 | Constraint basis data | Sisipkan langsung lewat SQL: slot duplikat, jam 25, status tidak valid, harga negatif | AC-22 |
| 4 | Autentikasi, otorisasi, kepemilikan | Penyewa B mengakses pesanan atau bukti penyewa A; penyewa memanggil endpoint admin; akun belum terverifikasi memesan | AC-03, AC-18, AC-23 |
| 5 | CRUD data persisten | CRUD lapangan, tarif, jam operasional, blacklist; data tetap ada setelah aplikasi dimulai ulang | AC-15, AC-20 |
| 6 | Migrasi dan relasi | Basis data kosong, migrasi, seed, aplikasi berjalan; relasi sesuai ERD | AC-30 |
| 7 | Web Push lewat worker | Unggah bukti, admin menerima notifikasi; worker dimatikan lalu dinyalakan kembali | AC-24, AC-25 |
| 8 | Kegagalan pekerjaan dan subscription tidak valid | Subscription 410 dihapus; simulasi kegagalan, percobaan ulang terbatas, status gagal tercatat | AC-26, AC-27, AC-28 |
| 9 | Konsistensi data dan penanganan error | Dua permintaan bersamaan ke slot sama; setujui vs kedaluwarsa bersamaan; pesan error tanpa detail internal | AC-01, AC-29 |

Pengujian otomatis disarankan untuk aturan bisnis inti: perhitungan batas bayar (BR-07), batas H-1 (BR-12), harga lintas tarif (AC-05), transisi status, dan pemesanan bersamaan (BR-01).

---

## 18. Pemetaan Ketentuan Teknis ke PRD **[v1.1]**

| Ketentuan dokumen teknis | Dipenuhi oleh |
|---|---|
| 1. Teknologi wajib | 17.1 |
| 2. Validasi tiga lapisan | 17.2, AC-21, AC-22 |
| 3. Basis data dan integritas data | Bagian 7, 17.3, AC-01, AC-29 |
| 4. Autentikasi dan keamanan | Bagian 10.1, 17.4, AC-23, AC-31 |
| 5. Web Push dan background worker | Bagian 8, 17.6, AC-24 sampai AC-28 |
| 6. Unggah berkas dan object storage | 17.5, FR-ADM-02, FR-PAY-02 |
| 7. Penanganan error dan observabilitas | 17.7, AC-27 |
| 8. Kinerja dan kualitas kode | 17.3, 17.8, AC-32 |
| 9. Deployment dan dokumentasi | 17.9, AC-30 |
| 10. Pengujian dan verifikasi | 17.10, Bagian 13 |
| 11. Ketentuan umum (klarifikasi bila bertentangan) | Bagian 15, nomor 5 |

---

## 19. Pembagian Kerja Tim **[v1.2]**

Tim terdiri dari **3 orang: 1 Expert dan 2 Pemula** (Pemula A dan Pemula B). Seluruh kebutuhan fungsional (Bagian 4), proses otomatis (Bagian 8), dan tugas teknis (Bagian 17) dibagi habis tanpa ada yang tertinggal.

### 19.1 Prinsip Pembagian

1. **Bagian berisiko tinggi dipegang Expert**: anti double booking, transaksi pemesanan, logika kalender, worker, dan constraint basis data. Kesalahan di sini merusak seluruh sistem.
2. **Pemula mengerjakan bagian dengan pola jelas** (form, daftar, CRUD, halaman), dengan variasi tingkat kesulitan agar sama-sama berkembang.
3. **Satu orang memegang satu alur utuh** dari tampilan sampai data, supaya tanggung jawab jelas dan tidak saling menunggu.
4. **Beban diseimbangkan berdasarkan waktu**: Expert menerima poin lebih banyak karena bekerja lebih cepat, tetapi tidak sampai dua kali lipat karena ia juga meninjau kode dan membimbing.

**Skala poin kompleksitas:** 1 (sangat mudah) sampai 8 (sulit dan krusial). Poin adalah perkiraan dan dapat disesuaikan bila ada tugas yang ternyata lebih berat atau ringan.

### 19.2 Ringkasan Beban

| Orang | Fitur PRD | Tugas teknis (Bagian 17) | Total poin | Porsi |
|---|---|---|---|---|
| **Expert** | 59 | 25 | **84** | ~41% |
| **Pemula A** | 44 | 15 | **59** | ~28% |
| **Pemula B** | 46 | 18 | **64** | ~31% |

### 19.3 Expert: Inti Sistem dan Logika Kritis (84 poin)

**Alur yang dipegang:** fondasi, pemesanan, ketersediaan, dan seluruh proses di belakang layar.

| Tugas | Rujukan | Poin |
|---|---|---|
| Setup proyek, struktur folder, deploy, middleware hak akses (tamu/penyewa/admin), Docker Compose awal | Fondasi, 17.1 | 5 |
| Skema basis data dan migrasi seluruh entitas | Bagian 7 | 6 |
| Keunikan slot (anti double booking) di basis data | BR-01 | 5 |
| Kalender ketersediaan dan perhitungan status slot | FR-PUB-04 | 8 |
| Cek ulang ketersediaan saat konfirmasi | FR-ORD-03 | 5 |
| Pembuatan pesanan (transaksi atomik, harga terkunci, batas bayar) | FR-ORD-04 | 8 |
| Validasi pesanan (jam operasional, tarif, jam berurutan, tanggal lampau) | FR-ORD-05 | 3 |
| Blacklist jadwal dengan peringatan bentrok | FR-ADM-05 | 5 |
| Proses otomatis berulang: kedaluwarsa, selesai, pembersihan token | Bagian 8 | 7 |
| Pencatat RiwayatStatus (dipanggil semua perubahan status) | Bagian 7 | 3 |
| Keamanan akses berkas bukti (hanya pemilik dan admin) | 10.1, 17.5 | 4 |
| **[Teknis]** Worker BullMQ: pengiriman Web Push, retry terbatas, penanganan subscription tidak valid | 17.6 | 6 |
| **[Teknis]** NotifikasiPush (outbox) dan pemasukan ke antrean, penyapu notifikasi | 17.6 | 4 |
| **[Teknis]** Constraint basis data lanjutan lewat SQL migrasi (CHECK, unik parsial, tumpang tindih tarif) | 17.2 | 5 |
| **[Teknis]** Rate limiting | 17.4 | 3 |
| **[Teknis]** Logging Pino dan Sentry (web dan worker) | 17.7 | 3 |
| **[Teknis]** Tes otomatis aturan bisnis inti (anti double booking, batas bayar, H-1, harga lintas tarif) | 17.10 | 4 |

**Tugas tambahan (tanpa poin):** meninjau semua pull request, menyiapkan contoh acuan (skema Zod, pola endpoint, pola halaman), dan membantu pemula yang tersendat.

### 19.4 Pemula A: Sisi Penyewa, Akun, dan Pembatalan (59 poin)

**Alur yang dipegang:** dari tamu mendaftar sampai penyewa memantau, membatalkan, dan menerima notifikasi.

| Tugas | Rujukan | Poin |
|---|---|---|
| Daftar lapangan | FR-PUB-01 | 2 |
| Filter jenis olahraga | FR-PUB-02 | 1 |
| Detail lapangan (foto, fasilitas, lokasi, harga) | FR-PUB-03 | 3 |
| Tombol "Pesan" mengarah ke login lalu kembali ke slot terpilih | FR-PUB-05 | 2 |
| Daftar akun | FR-ACC-01 | 2 |
| Verifikasi email dan kirim ulang | FR-ACC-02 | 3 |
| Masuk dan keluar | FR-ACC-03 | 3 |
| Lupa dan reset kata sandi | FR-ACC-04 | 3 |
| Akun nonaktif tidak bisa masuk | FR-ACC-05 | 1 |
| Tampilan pemilihan slot di kalender | FR-ORD-01 | 4 |
| Layar konfirmasi pesanan | FR-ORD-02 | 2 |
| Jadwal bermain pribadi | FR-HIS-01 | 3 |
| Riwayat pesanan | FR-HIS-02 | 2 |
| Detail pesanan dan linimasa status | FR-HIS-03 | 3 |
| Tombol kontekstual per status | FR-HIS-04 | 2 |
| Pesan ulang | FR-HIS-05 | 1 |
| Form pengajuan pembatalan, validasi H-1, status | FR-CAN-01 sampai 04 | 6 |
| Tombol nonaktifkan akun di data pengguna | FR-ADM-09 | 1 |
| **[Teknis]** Endpoint simpan dan hapus subscription | 17.6 | 2 |
| **[Teknis]** Service Worker dan tombol "Aktifkan notifikasi" (berpasangan dengan Expert) | 17.6 | 4 |
| **[Teknis]** Skema Zod sisi penyewa (akun, pesanan, pembatalan) | 17.2 | 3 |
| **[Teknis]** ERD dan dokumentasi arsitektur | 17.9 | 3 |
| **[Teknis]** Demonstrasi pengujian cakupan sisi penyewa | 17.10 | 3 |

### 19.5 Pemula B: Pembayaran dan Panel Admin (64 poin)

**Alur yang dipegang:** dari penyewa membayar sampai admin menyiapkan data dan memverifikasi.

| Tugas | Rujukan | Poin |
|---|---|---|
| Halaman pembayaran, rekening tujuan, hitung mundur | FR-PAY-01 | 3 |
| Unggah bukti (validasi tipe dan ukuran) | FR-PAY-02 | 3 |
| Pratinjau bukti sebelum dikirim | FR-PAY-03 | 2 |
| Perubahan status setelah unggah | FR-PAY-04 | 2 |
| Batalkan pesanan sebelum bayar | FR-PAY-05 | 2 |
| Login admin | FR-ADM-01 | 2 |
| Kelola lapangan (foto, fasilitas, jenis olahraga, lokasi) | FR-ADM-02 | 6 |
| Kelola tarif (validasi tumpang tindih) | FR-ADM-03 | 5 |
| Kelola jam operasional | FR-ADM-04 | 3 |
| Verifikasi bukti pembayaran | FR-ADM-06 | 4 |
| Verifikasi pengajuan pembatalan | FR-ADM-07 | 4 |
| Rekap sewa dan ekspor CSV | FR-ADM-08 | 5 |
| Pengaturan global | FR-ADM-10 | 2 |
| Daftar pesanan admin (cari dan filter) | FR-ADM-11 | 3 |
| **[Teknis]** Modul unggah object storage dan URL bertanda tangan | 17.5 | 5 |
| **[Teknis]** Skema Zod sisi admin dan pembayaran | 17.2 | 3 |
| **[Teknis]** Merapikan Docker Compose, `.env.example`, dan README | 17.9 | 3 |
| **[Teknis]** ESLint dan GitHub Actions | 17.8 | 2 |
| **[Teknis]** Dokumentasi VAPID, worker, serta daftar fitur selesai dan keterbatasan | 17.9 | 2 |
| **[Teknis]** Demonstrasi pengujian cakupan sisi admin dan pembayaran | 17.10 | 3 |

**Catatan:** Kelola tarif (validasi tumpang tindih) adalah tugas tersulit di bagian ini; kerjakan berpasangan dengan Expert pada bagian validasi.

### 19.6 Kontrak Antar-Anggota

| Dari | Untuk | Yang diserahkan | Kapan |
|---|---|---|---|
| Expert | Semua | Struktur proyek, skema basis data, seed, Docker Compose awal, contoh skema Zod dan pola endpoint | Awal, sebelum yang lain mulai |
| Expert | Pemula A | Cara mengambil status slot kalender | Sebelum A mengerjakan pemilihan slot |
| Expert | Pemula A dan B | Fungsi pencatat RiwayatStatus dan fungsi pembuat NotifikasiPush, dipanggil pada setiap perubahan status | Sebelum A dan B mengubah status pesanan |
| Pemula B | Expert dan Pemula A | Modul unggah dan URL bertanda tangan | Sebelum unggah foto dan bukti dikerjakan |
| Pemula B | Expert | Data tarif dan jam operasional yang valid (dipakai menghitung harga dan kalender) | Tahap 1 |
| Pemula B | Pemula A | Halaman pembayaran yang dituju setelah pesanan dibuat | Tahap 4 |
| Pemula A | Expert | Halaman konfirmasi yang memanggil proses pembuatan pesanan | Tahap 4 |
| Pemula A | Expert | Endpoint subscription dan Service Worker untuk diuji dengan worker | Tahap 4 |

### 19.7 Urutan Kerja per Tahap

| Tahap (Bagian 12) | Expert | Pemula A | Pemula B |
|---|---|---|---|
| **1. Fondasi data** | Setup, skema, middleware, constraint, Pino dan Sentry dasar | Mempelajari struktur proyek, mulai daftar lapangan | Login admin, kelola lapangan, jam operasional, tarif, pengaturan, modul unggah, Docker dan README |
| **2. Informasi publik** | Mendukung dan meninjau | Daftar, filter, detail lapangan | Melanjutkan Tahap 1, ESLint dan CI |
| **3. Ketersediaan** | Kalender dan blacklist | Menyiapkan tampilan slot | Mendukung data uji |
| **4. Akun dan transaksi** | Pesanan, validasi, anti double booking, keamanan berkas, worker, NotifikasiPush, rate limiting | Akun, verifikasi email, konfirmasi pesanan, endpoint subscription, Service Worker | Pembayaran, verifikasi bukti |
| **5. Pasca-transaksi** | Proses otomatis, tes otomatis | Jadwal, riwayat, pembatalan, pesan ulang, ERD, demonstrasi pengujian | Verifikasi pembatalan, rekap, daftar pesanan, dokumentasi, demonstrasi pengujian |

Di Tahap 1 sampai 3 Expert paling sibuk karena membangun fondasi; di Tahap 5 ia relatif longgar sehingga bisa menolong siapa pun yang tertinggal.

### 19.8 Aturan Kerja Tim

1. **Satu cabang per fitur**, digabung lewat pull request dan **wajib ditinjau Expert**.
2. Pemula tidak mengubah skema basis data sendiri; usulan perubahan lewat Expert agar tidak merusak pekerjaan lain.
3. Tinjauan kode berfungsi sebagai pembelajaran: Expert memberi catatan, bukan sekadar menyetujui.
4. **Rotasi ringan di tahap akhir**: Pemula A dan B saling meninjau pekerjaan sebelum ke Expert, agar kemampuan keduanya merata.
5. Pertemuan singkat tiap beberapa hari untuk melaporkan hambatan, terutama saat satu tugas menunggu hasil orang lain.
6. Setiap anggota harus mampu **menjelaskan implementasi bagiannya sendiri** (syarat dokumen teknis), sehingga tugas demonstrasi pengujian dipegang oleh pembuat fiturnya.

### 19.9 Pemeriksaan Kelengkapan

| Kelompok | Pemegang |
|---|---|
| FR-PUB-01, 02, 03, 05 | Pemula A |
| FR-PUB-04 | Expert |
| FR-ACC-01 sampai 05 | Pemula A |
| FR-ORD-01, 02 | Pemula A |
| FR-ORD-03, 04, 05 | Expert |
| FR-PAY-01 sampai 05 | Pemula B |
| FR-HIS-01 sampai 05 | Pemula A |
| FR-CAN-01 sampai 04 | Pemula A |
| FR-ADM-01, 02, 03, 04, 06, 07, 08, 10, 11 | Pemula B |
| FR-ADM-05 | Expert |
| FR-ADM-09 | Pemula A |
| Proses otomatis (Bagian 8) | Expert |
| Tugas teknis 17.1 sampai 17.10 | Dibagi sesuai Bagian 19.3 sampai 19.5 |

Pembagian ini mengasumsikan **kedua pemula berkemampuan kurang lebih setara**. Jika salah satu jelas lebih lemah, tugas yang paling berat bagi pemula (verifikasi email dan reset kata sandi pada Pemula A, kelola tarif pada Pemula B) dapat dipindahkan ke anggota yang lebih kuat atau ke Expert.
