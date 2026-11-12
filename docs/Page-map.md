# Page-map.md — Peta Halaman & Rute

> Sumber kebenaran: `docs/PRD.md` Bagian 9. File ini mencantumkan rute yang sudah ada di kode dan rute yang direncanakan PRD. Setiap rute berkas yang ada memeriksa kondisi: metadata, guard sesi, validasi param, loader, dan empat keadaan tampilan (loading/kosong/berhasil/galat).

---

## 1. Rute yang Sudah Ada di Kode

| Path | Method | Akses | Berkas utama | Keterangan |
|---|---|---|---|---|
| `/` | GET | Publik | `app/page.tsx` | Beranda + daftar lapangan (filter jenis olahraga) |
| `/masuk` | GET | Publik | `app/masuk/page.tsx` | Login penyewa; tamu diarahkan kembali via `?next=` |
| `/daftar` | GET | Publik | `app/daftar/page.tsx` | Pendaftaran akun |
| `/verifikasi-email` | GET | Publik | `app/verifikasi-email/page.tsx` | Verifikasi token email |
| `/jadwal-saya` | GET | Penyewa (wajib login) | `app/jadwal-saya/page.tsx` | Jadwal terkonfirmasi + menunggu pembayaran |
| `/jadwal-saya/loading` | — | — | `app/jadwal-saya/loading.tsx` | Skeleton saat memuat |
| `/pesan` | GET | Penyewa (wajib login & terverifikasi) | `app/pesan/page.tsx` | **PLACEHOLDER** pemesanan (FR-PUB-05 tidak selesai) |
| `/pesanan/{kode}/bayar` | GET | Penyewa (pemilik pesanan saja) | `app/pesanan/[kode]/bayar/page.tsx` | Halaman pembayaran + unggah bukti |
| `/pesanan/{kode}/bayar/loading` | — | — | `app/pesanan/[kode]/bayar/loading.tsx` | Skeleton halaman bayar |
| `/detail-pesanan` | GET | Publik | `app/detail-pesanan/page.tsx` | FE showcase baru; belum terhubung data pesanan nyata |
| `/api/auth/masuk` | POST | Publik | `app/api/auth/masuk/route.ts` | Login JSON |
| `/api/auth/daftar` | POST | Publik | `app/api/auth/daftar/route.ts` | Daftar JSON |
| `/api/auth/keluar` | POST | Publik (butuh cookie sesi) | `app/api/auth/keluar/route.ts` | Logout |
| `/api/auth/kirim-ulang` | POST | Publik | `app/api/auth/kirim-ulang/route.ts` | Kirim ulang verifikasi email |
| `/api/pesanan/{kode}/bukti` | POST | Penyewa (pemilik) | `app/api/pesanan/[kode]/bukti/route.ts` | Unggah bukti transfer |
| `/api/pesanan/{kode}/batal` | POST | Penyewa (pemilik) | `app/api/pesanan/[kode]/batal/route.ts` | Batalkan pesanan |

---

## 2. Rute yang Direncanakan PRD (Belum Ada di Kode)

| Path | Akses | PRD | Status | Catatan |
|---|---|---|---|---|
| `/lapangan/{id}` | Publik | FR-PUB-03 | Belum ada | Detail lapangan, galeri, fasilitas, lokasi, harga |
| `/lupa-sandi` | Publik | FR-ACC-04 | Belum ada | Reset kata sandi lewat email |
| `/reset-sandi` | Publik | FR-ACC-04 | Belum ada | Halaman reset setelah klik tautan |
| `/riwayat` | Penyewa | FR-HIS-02 | Belum ada | Daftar pesanan, terbaru dulu, filter status |
| `/riwayat/{kode}` | Penyewa (pemilik) | FR-HIS-03 | Belum ada | Detail pesanan, linimasa, bukti, tombol aksi |
| `/riwayat/{kode}/batal` | Penyewa (pemilik) | FR-CAN-01 | Belum ada | Form pengajuan pembatalan |
| `/admin/masuk` | Admin | FR-ADM-01 | Belum ada | Login admin terpisah |
| `/admin/lapangan` | Admin | FR-ADM-02 | Belum ada | Kelola lapangan |
| `/admin/tarif` | Admin | FR-ADM-03 | Belum ada | Kelola tarif |
| `/admin/jam-operasional` | Admin | FR-ADM-04 | Belum ada | Kelola jam operasional |
| `/admin/blacklist` | Admin | FR-ADM-05 | Belum ada | Blacklist jadwal |
| `/admin/verifikasi` | Admin | FR-ADM-06, 07 | Belum ada | Antrean bukti & pembatalan |
| `/admin/pesanan` | Admin | FR-ADM-11 | Belum ada | Daftar semua pesanan |
| `/admin/rekap` | Admin | FR-ADM-08 | Belum ada | Rekap sewa (CSV) |
| `/admin/pengguna` | Admin | FR-ADM-09 | Belum ada | Nonaktifkan/aktifkan akun |
| `/admin/pengaturan` | Admin | FR-ADM-10 | Belum ada | Rekening tujuan, batas bayar, H-1 |

Catatan: rute `/detail-pesanan` di kode saat ini adalah **FE showcase baru** (komponen `detail-pesanan/**`) dan belum terhubung data pesanan asli. PRD mengarahkan fitur detail pesanan ke `/riwayat/{kode}`. Keputusan arsitektur harus ditetapkan sebelum rute ini dipromosikan ke produksi.

---

## 3. Template Halaman Baru

Setiap halaman baru diwajibkan mengikuti pola ini (`app/<fitur>/page.tsx`):

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NamaView } from '@/components/NamaView';
import { wajibPenyewa } from '@/lib/auth/session'; // atau penggunaSaatIni() untuk publik
import { getNamaData } from '@/lib/<fitur>-data';

export const metadata: Metadata = { title: 'Gelanggang — <Judul>' };
export const dynamic = 'force-dynamic'; // bila data berubah waktu-nyata

const PARAM_REGEX = /^[A-Za-z0-9-]{4,40}$/;

export default async function <Halaman>({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PARAM_REGEX.test(id)) notFound();
  const pengguna = await wajibPenyewa('/<fitur>/…'); // tamu → /masuk?next=...
  const data = await getNamaData(id, pengguna.id); // id dari SESI, bukan request
  if (!data) notFound(); // milik orang lain = 404
  return <NamaView pengguna={{ nama: pengguna.nama }} data={data} now={new Date()} />;
}
```

Checklist halaman baru:
- [ ] `metadata.title` diisi.
- [ ] `dynamic = 'force-dynamic'` bila data waktu-nyata; statis boleh tanpa.
- [ ] Param/query divalidasi → `notFound()` bila tidak sah.
- [ ] Halaman privat pakai `wajibPenyewa()`; publik pakai `penggunaSaatIni()` opsional.
- [ ] Loader di `lib/` (bukan di `page.tsx`).
- [ ] `loading.tsx` dan `error.tsx` disediakan.
- [ ] Empat keadaan: loading, kosong, berhasil, galat.

---

## 4. View Komponen per Halaman

| Halaman | View komponen | Lokasi | Props utama |
|---|---|---|---|
| Beranda | Section (`DarkPanel`, `Stats`, `LapanganSection`, `KalenderSection`, …) | `components/Sections.tsx` | `data: BerandaData` |
| Masuk/Daftar | `AuthShell` + form | `components/auth/AuthShell.tsx`, `MasukForm.tsx`, `DaftarForm.tsx` | `varian`, `children` |
| Jadwal saya | `JadwalSayaView` | `components/JadwalSayaView.tsx` | `pengguna`, `terverifikasi`, `terkonfirmasi`, `menunggu`, `now` |
| Pembayaran | `PembayaranView` | `components/PembayaranView.tsx` | `pengguna`, `data`, `now` |
| Detail-pesanan (showcase) | Inline di `page.tsx` | `app/detail-pesanan/page.tsx` | — |

Ketika membuat view baru, letakkan di `components/<Fitur>View.tsx` dan jaga agar tipis (render props saja, tidak ambil data sendiri).

---

## 5. Rute API (Route Handler)

Semua Route Handler mengikuti pola delegasi tipis:

```
app/api/<fitur>/[kode]/<aksi>/route.ts
   └─► handlers.<aksi>(req, kode)  (lib/<fitur>/handlers.ts)
```

Respons JSON standar:
```json
{ "ok": true }
```
atau galat:
```json
{ "ok": false, "kode": "VALIDASI", "galat": { "email": "Email sudah terdaftar" } }
```

Kode galat yang dipakai di seluruh proyek:
- `VALIDASI` — 400, galat per field dari Zod.
- `GALAT_SERVER` — 500, tak terduga (detail ke log saja).
- `DIBATASI` — 429, rate limit.
- `MEDIA_TIDAK_DIDUKUNG` — 415, bukan JSON.
- `JSON_RUSAK` — 400, body tidak valid.
- `STATUS_BERUBAH`, `KEDALUWARSA`, `TIDAK_DITEMUKAN` — pembayaran sudah tidak valid.
- `TERLALU_BESAR`, `TIPE_TIDAK_DIDUKUNG`, `KOSONG` — unggah bukti.
