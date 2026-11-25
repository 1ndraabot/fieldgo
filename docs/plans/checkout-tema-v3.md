# Rencana: Checkout Bertema Sendiri dengan Xendit Payment Requests v3

Status: **selesai diimplementasikan** (kode, UI, dan tes lulus; sisa: E2E test mode manual)
Tanggal disusun: 22 November 2026

## 1. Tujuan

Mengganti halaman checkout Xendit yang di-host (Invoice API v2) dengan halaman
checkout milik FieldGo sendiri, sehingga tampilan mengikuti tema aplikasi, tetapi
VA/QRIS tetap dapat ditampilkan dan dibayar.

Keputusan: **tetap Xendit**, memakai **Payment Requests API v3 + UI sendiri**.
Bukan Midtrans. Midtrans Snap juga hosted dan tidak memberi kontrol tema penuh;
tema penuh di Midtrans pun menuntut Core API, jadi tidak ada keuntungan.

## 2. Cakupan

Termasuk:

- QRIS (render QR string sendiri)
- VA BCA, BNI, BRI, Mandiri, Permata (nomor VA + tombol salin)
- E-wallet DANA, OVO, ShopeePay (redirect ke aplikasi penyedia)
- Halaman instruksi, hitung mundur, polling status
- Callback, sinkron otomatis, refund v3, pemetaan status
- Masa berlaku pembayaran **1 jam**

Tidak termasuk:

- Kartu kredit/debit (butuh tokenisasi dan lingkup PCI)
- Cicilan/paylater
- Retail outlet/OTC
- Perubahan tema halaman non-pembayaran

## 3. Fakta yang sudah diverifikasi di test mode

Diuji langsung ke `api.xendit.co` memakai kunci test:

| Metode | Respons v3 | Yang ditampilkan |
|---|---|---|
| QRIS | `201`, `REQUIRES_ACTION`, `PRESENT_TO_CUSTOMER` / `QR_STRING` | QR string |
| BCA/BNI/BRI/Mandiri/Permata VA | `201`, `REQUIRES_ACTION`, `PRESENT_TO_CUSTOMER` / `VIRTUAL_ACCOUNT_NUMBER` | Nomor VA; wajib `channel_properties.display_name` |
| DANA | `201`, `REQUIRES_ACTION`, `REDIRECT_CUSTOMER` / `WEB_URL` | Redirect; wajib `success_return_url` |
| OVO | `400` bila tanpa `account_mobile_number` | Redirect |
| ShopeePay | `400` bila tanpa `success_return_url` | Redirect |
| Simulasi | `POST /v3/payment_requests/{id}/simulate` body `{ amount }` → `200` | Untuk E2E test mode |
| Expiry | `channel_properties.expires_at` diterima QRIS & VA; respons mengembalikan expiry yang sama | Hitung mundur sendiri |
| Expiry e-wallet | DANA menerima `expires_at` (`201`) tetapi tidak menggemakannya | Aplikasi wajib menegakkan batas sendiri |

Catatan: untuk e-wallet, ada satu layar redirect ke aplikasi penyedia. Itu batasan
industri, bukan kekurangan Xendit.

## 4. Aturan masa berlaku pembayaran: 1 jam

Keputusan yang direkomendasikan: **berlaku untuk seluruh pesanan**, bukan hanya
masa berlaku VA/QR. Alasannya, kalau hanya kanal yang kedaluwarsa, slot tetap
tertahan sampai 24 jam meski pembayaran sudah mati.

Aturan:

```
batasBayarPada = min(dibuat + 1 jam, jam mulai main WIB)
expires_at v3  = batasBayarPada
```

Rincian perubahan:

1. Default `batas_bayar_jam` diubah `24 → 1`:
   - `lib/admin/pengaturan/data.ts` (`DEFAULT_PENGATURAN`)
   - `lib/pesan/service.ts` (nilai cadangan)
   - data demo (`lib/demo-fe.ts`, `lib/demo.ts` bila relevan)
   - dokumentasi/seed yang menyebut 24 jam
   - rentang validasi tetap `1–72` agar admin masih bisa menaikkan
2. `channel_properties.expires_at` dikirim untuk QRIS, VA, dan e-wallet.
3. Hitung mundur UI memakai `pembayaran_gateway.kedaluwarsa_pada` (kolom sudah ada,
   tanpa migrasi DB).
4. Setelah lewat batas:
   - nomor VA/QR disembunyikan, tombol bayar nonaktif
   - status tampil **Kedaluwarsa**
   - slot dilepas oleh logika yang sudah ada
5. Pembayaran yang masuk setelah batas tetap diproses sebagai `review_telat`
   (perilaku `putusanNotifikasi` yang sudah ada) → admin memutuskan terima/refund.
6. Alternatif bila dosen meminta angka mutlak: hapus pengaturan 1–72 dan pin 1 jam.
   Rekomendasi tetap: default 1 jam, masih dapat diubah admin.

Catatan: perubahan default ini juga langsung memperpendek invoice **v2** yang
sekarang, karena invoice memakai `batasBayarPada` yang sama.

## 5. Rancangan teknis

### 5.1 Tipe dan provider

`lib/gateway/types.ts`

- Tambah bentuk instruksi pembayaran:

```ts
type InstruksiPembayaran =
  | { jenis: 'qr'; nilai: string; kedaluwarsaPada: Date }
  | { jenis: 'va'; nomor: string; bank: string; kedaluwarsaPada: Date }
  | { jenis: 'redirect'; url: string; kedaluwarsaPada: Date };
```

- `TransaksiGateway` memuat `instruksi` dan `metode` (channel code).
- `BuatTransaksiInput` memuat `metode` pilihan pengguna (bukan lagi daftar
  `metodeAktif` global saja).

`lib/gateway/xendit.ts`

- `buatTransaksi` memanggil `POST /v3/payment_requests`:
  - `reference_id` = orderId internal
  - `request_amount` = total pesanan dari server
  - `channel_code` sesuai pilihan
  - `channel_properties`:
    - VA: `display_name`, `expires_at`
    - QRIS: `expires_at`
    - e-wallet: `success_return_url`, `failure_return_url`, `expires_at`
    - OVO: `account_mobile_number`
  - `providerRef` = `payment_request_id` (`pr-…`)
  - `token` = QR string atau nomor VA
  - `redirectUrl` = URL e-wallet
  - `metode` = `channel_code`
- `bacaNotifikasi` mendeteksi bentuk payload:
  - v3: `payment_request_id` / `payment_id`, event `payment.capture`,
    `payment.failure`, nominal dari `captures[].capture_amount`
  - v2 (kompatibilitas): `invoice_id` / `external_id` seperti sekarang
  - verifikasi `x-callback-token` tetap timing-safe
- `ambilStatus`:
  - jika `providerRef` berawalan `pr-` → `GET /v3/payment_requests/{id}`
  - selain itu → jalur invoice v2 (untuk transaksi lama)
- `refund`:
  - v3 → `POST /v3/refunds` dengan `payment_request_id`, header
    `api-version: 2024-11-11`, alasan enum
  - v2 → `POST /refunds` seperti sekarang
  - kanal tanpa refund → kegagalan gateway → refund manual (perilaku ada)

### 5.2 Penyimpanan

Tanpa migrasi DB. Kolom yang sudah ada dipakai:

| Kolom | Isi v3 |
|---|---|
| `provider_ref` | `pr-…` |
| `token` | QR string / nomor VA |
| `redirect_url` | URL e-wallet |
| `metode` | `QRIS`, `BCA_VIRTUAL_ACCOUNT`, `DANA`, dst. |
| `kedaluwarsa_pada` | `expires_at` |
| `status` | `pending` → `dibayar` / `kedaluwarsa` / `perlu_tinjau` |

`gateway_event.event_key` memakai `payment_id`/event id agar idempoten.

### 5.3 Pemetaan status

| Status v3 | Status internal |
|---|---|
| `REQUIRES_ACTION` | `pending` |
| `PENDING` | `pending` |
| `SUCCEEDED` | `dibayar` |
| `EXPIRED` | `kedaluwarsa` |
| `FAILED` / `CANCELED` | `gagal` |
| tidak dikenal | `perlu_tinjau` |

Callback `payment.capture` diverifikasi nominalnya terhadap total pesanan;
nominal tidak cocok → `perlu_tinjau`, tidak pernah auto-konfirmasi.

### 5.4 Halaman dan alur UI

1. `/pesanan/{kode}/bayar`
   - menampilkan ringkasan pesanan dan hitung mundur 1 jam
   - daftar metode: QRIS, 5 VA, e-wallet (sesuai `metodeAktif` pengaturan)
   - memilih metode → `POST /api/pesanan/{kode}/bayar` dengan metode
2. Halaman instruksi (bisa satu halaman dengan status):
   - QR: render gambar QR dari `token` (pustaka `qrcode`)
   - VA: nomor + tombol salin + nama bank
   - e-wallet: tombol menuju `redirect_url`
   - hitung mundur; setelah habis tampil Kedaluwarsa
3. `StatusPembayaran` tetap polling 5 detik dan sinkron tiap ±15 detik
   (sudah diimplementasikan) — tidak berubah konsep.

### 5.5 Callback dan sinkron

- Callback URL tetap `POST /api/gateway/xendit`.
- Perlu didaftarkan juga di bagian **Payment** dashboard Xendit mode test,
  bukan hanya Invoice. Token callback sama.
- Sinkron otomatis `POST /api/pesanan/{kode}/sinkron` tetap dipakai; provider
  v3 dipilih berdasarkan prefix `pr-`.
- Idempotensi tetap lewat `gateway_event.event_key` unik.

### 5.6 Refund

- Refund gateway v3: `POST /v3/refunds` (`payment_request_id`).
- Event refund v3 (`refund.succeeded` / `refund.failed`) dipetakan ke status
  refund internal yang sudah ada.
- Kanal tanpa dukungan refund tetap jatuh ke refund manual; jangan mengubah
  alur admin yang sudah teruji.

## 6. Berkas yang diperkirakan tersentuh

| Berkas | Perubahan |
|---|---|
| `lib/gateway/types.ts` | tipe instruksi, input metode |
| `lib/gateway/xendit.ts` | provider v3 + kompatibilitas v2 |
| `lib/gateway/rules.ts` | pemetaan status v3 |
| `lib/gateway/service.ts` | validasi metode, meneruskan instruksi |
| `lib/gateway/prisma-store.ts` | menyimpan instruksi ke kolom yang ada |
| `lib/gateway/handlers.ts` | body metode pada endpoint bayar |
| `lib/gateway/deps.ts` | tidak banyak berubah |
| `components/pembayaran/*` | pemilihan metode + halaman instruksi |
| `app/pesanan/[kode]/bayar/page.tsx` | data instruksi |
| `lib/admin/pengaturan/*` | default 1 jam |
| `lib/pesan/service.ts` | nilai cadangan 1 jam |
| `lib/admin/pengecualian/service.ts` | refund v3 |
| `tests/gateway-xendit.test.ts` | tes provider v3 |
| `tests/gateway.test.ts` | tes service/metode/expiry |
| `tests/gateway-handler.test.ts` | tes handler |
| `tests/pesan.test.ts` | tes batas 1 jam |
| `README.md` | alur baru + go-live |

## 7. Tahapan implementasi

1. **Fondasi**: tipe instruksi, pemetaan status, aturan expiry 1 jam, tes murni.
2. **Provider v3**: pembuatan QRIS + VA + e-wallet, simulasi test mode, tes unit.
3. **Penyimpanan & sinkron**: simpan `pr-`, baca status v3, kompatibilitas v2.
4. **Callback v3**: parser `payment.capture`/`payment.failure`, idempotensi, tes.
5. **UI**: pemilihan metode, halaman instruksi QR/VA/redirect, hitung mundur.
6. **Refund v3**: endpoint + event + fallback manual, tes.
7. **E2E test mode**: buat pesanan → pilih metode → bayar via simulate →
   konfirmasi otomatis (callback dan sinkron) → refund → bersihkan data.
8. **Dokumentasi**: README, catatan callback Payment, checklist go-live.

## 8. Kriteria penerimaan

- Halaman checkout 100% bertema FieldGo; tidak ada redirect ke
  `checkout.xendit.co` untuk QRIS dan VA.
- Pesanan baru memiliki `batasBayarPada` maksimal 1 jam sejak dibuat dan tidak
  melewati jam mulai main.
- `expires_at` QRIS/VA sama dengan `batasBayarPada`.
- VA menampilkan nomor yang bisa disalin; QRIS menampilkan QR yang dapat dipindai.
- Setelah 1 jam: status Kedaluwarsa, slot dilepas, instruksi tidak bisa dipakai.
- Pembayaran sukses mengubah pesanan menjadi Terkonfirmasi otomatis lewat
  callback, dan tetap pulih lewat sinkron bila callback gagal.
- Nominal tidak cocok atau pembayaran telat tidak pernah auto-konfirmasi.
- Refund v3 berhasil untuk kanal yang mendukung; kanal lain jatuh ke manual.
- `npx tsc --noEmit` bersih dan seluruh tes lulus.

## 9. Risiko dan penanganan

| Risiko | Penanganan |
|---|---|
| Callback Payment belum didaftarkan di dashboard | Daftarkan terpisah dari Invoice; uji dengan simulate dan cek `gateway_event` |
| E-wallet tidak menegakkan `expires_at` | Aplikasi menolak instruksi lewat batas; pembayaran telat → review admin |
| Transaksi v2 lama masih berjalan saat migrasi | Parser dan `ambilStatus`/`refund` mendeteksi prefix `pr-` vs invoice id |
| Kartu tidak didukung | Di luar cakupan; metode kartu disembunyikan |
| Refund kanal tertentu tidak didukung | Fallback refund manual yang sudah ada |
| Polling berlebihan | Throttle sinkron 1×/10 detik per pesanan yang sudah ada |

## 10. Catatan

- Tidak ada migrasi DB.
- Tidak ada perubahan pada autentikasi/sesi.
- Kredensial tetap hanya dari environment.
- Rencana ini telah dieksekusi; status implementasi tercatat di bagian atas dokumen.
