# Components-guideline.md — Panduan Membangun Komponen

> Cara membangun halaman dan komponen di proyek ini. Melengkapi `docs/Style.md` (visual) dan `docs/Conventions.md` (aturan kode umum).
> Semua contoh diambil dari kode yang benar-benar dipakai di proyek.

---

## 1. Prinsip Dasar

1. **Server Component secara default.** `'use client'` hanya untuk komponen yang butuh state, event, `useEffect`, atau API browser (lihat §3).
2. **Halaman tipis, tampilan terpisah.** `page.tsx` hanya: cek sesi → ambil data (loader di `lib/`) → render satu komponen View dari `components/`. Logika tampilan tidak ditulis di `page.tsx`.
3. **Named export untuk semua komponen bersama.** Ini aturan keras — kesalahan historis `import Header from '@/components/Header'` pada `app/detail-pesanan/page.tsx` menimbulkan `TS2613` karena `Header` diekspor sebagai named export. Pengecualian hanya untuk berkas khusus Next.js (`page`, `layout`, `loading`, `error`, `route`, `middleware`) yang memang mewajibkan default export.
4. **Data masuk lewat props, bukan diambil sendiri.** Komponen View menerima data siap-tampil dari server. Fetch di sisi klien hanya untuk aksi tulis (form submit ke Route Handler).

---

## 2. Struktur Folder Komponen

```
components/
├── Header.tsx, Footer.tsx, Hero.tsx   # shared: dipakai lintas halaman (named export)
├── icons.tsx, status.ts               # primitif global (ikon, warna status)
├── Sections.tsx                       # section beranda
├── JadwalSayaView.tsx, JadwalKartu.tsx, PembayaranView.tsx   # view per halaman
├── auth/                              # modul fitur: form, banner, shell
│   ├── ui.tsx                         #   primitif fitur (Banner, Field, TombolUtama…)
│   └── MasukForm.tsx, DaftarForm.tsx, …
├── pembayaran/                        # modul fitur: BuktiForm, HitungMundur, SalinRekening
└── detail-pesanan/                    # ⚠ modul showcase lama (lihat Style.md §9, jangan ditiru polanya)
    └── ui/                            #   primitif modul
```

Aturan:
- Komponen milik satu fitur → folder `components/<fitur>/`. Primitif kecil milik fitur → `components/<fitur>/ui.tsx` atau `ui/`.
- Komponen dipakai ≥ 2 halaman → letakkan di root `components/`.
- **Jangan** membuat folder `components/<fitur>/` dengan CSS, font, dan layout sendiri (pelajaran dari `detail-pesanan`; lihat §10).

---

## 3. Server vs Client — Kapan `'use client'`

| Butuh | Contoh di proyek | Jenis |
|---|---|---|
| Render data statis/dari loader | `JadwalSayaView`, `DarkPanel`, `Header` | Server |
| `useState`/form | `MasukForm`, `BuktiForm`, `CourtList` (filter) | Client |
| `useEffect` (timer, preview berkas) | `HitungMundur`, `BuktiForm` | Client |
| `useRouter`/navigasi programatik | `KeluarButton`, `BuktiForm` | Client |
| Event handler (onClick/onChange) | `SlotPicker`, `KirimUlangButton` | Client |

Catatan:
- Client component boleh berisi import server-safe (`lib/format`, `lib/data`) — yang dilarang adalah mengimpor modul yang menyentuh database/secret (`lib/db`, `lib/auth/session`) ke dalam client component.
- Turunkan `'use client'` sekecil mungkin: tombol kecil jadi client, bukan seluruh halaman.

---

## 4. Anatomi Berkas Komponen

Urutan penulisan yang dipakai konsisten di seluruh proyek:

```tsx
// 1. Import (path alias @/, tanpa ekstensi)
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { formatRupiah, labelPanjang } from '@/lib/format';

// 2. Konstanta lokal (map/tabel kecil, kelas gabungan) — UPPER_CASE
const NADA = { merah: '…', amber: '…' } as const;

// 3. Tipe Props (inline type, bukan interface)
type Props = { kode: string; onSelesai?: () => void };

// 4. JSDoc satu baris bila tujuannya tidak jelas dari nama
/** Pratinjau bukti transfer sebelum dikirim; penolakan admin bersifat final (FR-PAY-03). */
export function BuktiForm({ kode }: Props) { … }
```

Gaya:
- Tipe props ditulis inline `type Props = { … }` atau langsung di parameter untuk komponen kecil: `{ p }: { p: PesananJadwal }`.
- Konstanta gaya gabungan boleh jadi konstanta modul: `const pad = 'px-[clamp(16px,4.5vw,64px)]'` (lihat `Sections.tsx`).
- `satisfies` untuk memvalidasi bentuk objek terhadap tipe (`lib/beranda.ts`).
- Kelas panjang boleh dibaca pakai template literal; kondisional memakai ternary pendek, bukan helper kelas pihak ketiga (tidak ada `clsx`/`cn` — jangan menambahnya).

---

## 5. Pola Halaman (`page.tsx`) — WAJIB

Template yang dipakai semua halaman berdata (contoh nyata: `app/pesanan/[kode]/bayar/page.tsx`):

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PembayaranView } from '@/components/PembayaranView';
import { wajibPenyewa } from '@/lib/auth/session';
import { getHalamanBayar } from '@/lib/pembayaran/data';

export const metadata: Metadata = { title: 'Gelanggang — Pembayaran' };
export const dynamic = 'force-dynamic'; // data waktu-nyata (slot, batas bayar) WAJIB force-dynamic

const KODE = /^[A-Za-z0-9-]{4,40}$/;

export default async function Bayar({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;
  if (!KODE.test(kode)) notFound();                    // 1. validasi param sebelum DB
  const pengguna = await wajibPenyewa('/pesanan/…');   // 2. guard sesi (tamu → /masuk?next=…)
  const data = await getHalamanBayar(kode, pengguna.id); // 3. loader selalu terikat id dari SESI
  if (!data) notFound();                               // 4. milik orang lain = 404, bukan error
  return <PembayaranView pengguna={{ nama: pengguna.nama }} data={data} now={new Date()} />;
}
```

Checklist halaman baru:
- [ ] `metadata.title` diisi.
- [ ] Data yang berubah seiring waktu (`dynamic = 'force-dynamic'`); halaman statis boleh tanpa itu.
- [ ] Param/query divalidasi (regex/Zod `lib/params.ts`) → `notFound()` bila tidak sah.
- [ ] Halaman privat: `wajibPenyewa(next)` / `penggunaSaatIni()`; id pengguna dari sesi, **bukan** dari request.
- [ ] Tidak ada perhitungan harga/status di klien.

### `loading.tsx` dan `error.tsx` (wajib untuk halaman berdata)
- `loading.tsx`: skeleton dengan bentuk menyerupai halaman, `role="status" aria-live="polite"`, `sr-only` label, warna `bg-mist`/`bg-mint`, `animate-pulse`. Contoh: `app/jadwal-saya/loading.tsx`.
- `error.tsx`: `'use client'`, menerima `{ error, reset }`, pesan Indonesia yang menyebut tindakan perbaikan, tombol "Coba lagi" (`reset`). Contoh: `app/error.tsx`.
- **Empat keadaan wajib ada** untuk setiap tampilan berdata (PRD 17.8): loading, kosong (empty state dengan ajakan bertindak — lihat `Bagian` di `JadwalSayaView.tsx`), berhasil, galat.

---

## 6. Aturan Props (Server → Client)

- Props harus **seriable** oleh RSC: string, number, boolean, Date, array/objek polos, tipe union. `Date` aman dikirim (`now={new Date()}`); **fungsi tidak boleh**.
- Kirim data minimal: `pengguna={{ nama: pengguna.nama }}` — jangan pernah mengirim objek pengguna utuh (hash sandi, token) ke klien (PRD 17.4).
- Komponen client yang butuh "waktu sekarang" menerima `now` sebagai prop dari server, bukan memanggil `new Date()` sendiri saat render (risiko hydration mismatch).

---

## 7. Pola Form & Aksi Tulis

Semua form mengikuti pola `BuktiForm` / `MasukForm`:

1. `'use client'`, state per kebutuhan: nilai, `galat`, `kirim` (men-disable tombol), dan bila perlu hitung mundur.
2. Submit → `fetch` ke Route Handler (`app/api/**/route.ts`) dengan JSON atau `FormData`.
3. Respons galat memakai kode mesin (`VALIDASI`, `DIBATASI`, `STATUS_BERUBAH`, …) → komponen menerjemahkan ke pesan Indonesia yang menyebut tindakan perbaikan.
4. Galat per field dari Zod (`error.flatten().fieldErrors`) ditampilkan di bawah input dengan `role="alert"` + `aria-invalid` + `aria-describedby`.
5. Sukses → `router.refresh()` (server merender ulang dengan data baru), bukan memodifikasi state global.
6. Batas klien hanyalah lapisan 1: server memvalidasi ulang semuanya (PRD 17.2 — validasi tiga lapisan).
7. Berkas: pratinjau sebelum kirim (FR-PAY-03), cek tipe/ukuran di klien **dan** server.

---

## 8. Aksesibilitas (wajib, PRD 17.8)

- Setiap input punya `<label htmlFor>`; galat terhubung via `aria-describedby`.
- Ikon dekoratif `aria-hidden="true"`; ikon tombol ikon-only punya `aria-label`.
- Toggle memakai `aria-pressed`; status slot memakai label teks + warna (jangan warna saja).
- Banner keadaan memakai `role="alert"` (galat) / `role="status"` (info).
- Alur utama (kalender slot, form, dialog) harus bisa dioperasikan keyboard; fokus terlihat (sudah diatur global — jangan `outline-none` tanpa pengganti).
- Teks tombol deskriptif ("Unggah bukti", bukan "Kirim").

---

## 9. Ikon & Status

- Ikon baru → tambahkan path ke `components/icons.tsx` (map `PATHS` + `IconName`), jangan SVG mentah di komponen.
- Warna status slot/pesanan → selalu dari `components/status.ts` (`STATUS`); label Indonesia wajib ikut tampil.

---

## 10. Keamanan Hydration (pelajaran dari bug nyata)

Error hydration yang pernah terjadi di `/detail-pesanan`: atribut `<html>`/`<body>` berbeda antara server dan klien karena layout segmen me-render `<html>` dengan className variabel font dari `next/font`. Aturan agar tidak terulang:

1. **Hanya `app/layout.tsx` yang me-render `<html>` dan `<body>`.** Layout segmen (`app/<fitur>/layout.tsx`) dilarang me-render keduanya atau mengimpor CSS/font sendiri. Saat ini `app/detail-pesanan/layout.tsx` melanggar aturan ini — jadwal penghapusannya ada di Style.md §9.
2. Kelas variabel font (`${jakarta.variable} …`) hanya di root layout.
3. Dilarang di render awal komponen yang di-hydrate: `Date.now()`, `Math.random()`, `new Date()` tanpa prop dari server, `toLocaleString`/`toLocaleDateString`, cabang `typeof window !== 'undefined'` yang mengubah markup awal.
4. Semua format waktu/angka memakai `lib/format.ts` (deterministik, WIB).
5. Data acak/data jam yang tampil di HTML awal harus dihitung di server dan dikirim sebagai props.
6. Bila ada peringatan hydration, **perbaiki penyebabnya** — jangan tambah `suppressHydrationWarning`.

---

## 11. Kapan Membuat Komponen Baru

- Markup sama dipakai ≥ 2 tempat, ATAU komponen > ± 80 baris yang bisa dipecah bermakna (contoh: `Bagian` di `JadwalSayaView.tsx`).
- Beri nama berdasarkan peran tampilan dalam bahasa proyek (Indonesia): `JadwalKartu`, `BannerVerifikasi`, `TombolUtama`, `HitungMundur`; Inggris diperbolehkan untuk istilah desain umum (`Header`, `Footer`, `Hero`) — konsisten dengan sekitar.
- Satu komponen = satu tanggung jawab; komposisi lewat `children`/props, bukan properti konfigurasi raksasa.

---

## 12. Checklist Sebelum Commit (komponen)

- [ ] Named export (kecuali `page/layout/loading/error`).
- [ ] Server default; `'use client'` seminimal mungkin.
- [ ] Props seriable, minimal, tanpa data sensitif.
- [ ] Halaman: metadata, guard, validasi param, loader lib, empat keadaan lengkap.
- [ ] Form: kode galat diterjemahkan, tombol disabled saat mengirim, refresh setelah sukses.
- [ ] A11y §8 lengkap; ikon/status dari sumber tunggal.
- [ ] Tidak melanggar aturan hydration §10.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` lulus.
