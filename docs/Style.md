# Style.md — Aturan Tampilan (Ringkas, Penting)

> Sumber token: `app/globals.css` (`@theme` Tailwind v4). Aturan ini mencegah error seperti yang baru saja diperbaiki di `/detail-pesanan`.

---

## 1. Warna — Pakai Token Utama Saja

Jangan menulis hex literal baru. Ambil dari `@theme` di `app/globals.css`:

| Token | Digunakan untuk |
|---|---|
| `ink` (`#0B2B1E`) | Teks utama; surface gelap |
| `forest` (`#134230`) | Surface gelap sekunder |
| `brand` (`#0E8A4A`) | Tombol utama |
| `brand-2` (`#16A05A`) | Aksen teks hijau |
| `brand-3` (`#22C06B`) | Blur dekoratif, surface futsal |
| `lime` (`#C6F432`) | Aksen cerah, badge |
| `mint` (`#DDF7E8`) | Surface lembut, chip |
| `mist` (`#F2FCF6`) | Latar section abu kehijauan |
| `line` (`#D7EBDF`) | Border, divider |
| `muted` (`#5B7266`) | Teks sekunder |

**Warna status slot** selalu dari `components/status.ts` (`STATUS`), jangan buat baru.

---

## 2. Font

| Kelas | Font | Pemakaian |
|---|---|---|
| `font-sans` | Plus Jakarta Sans | Teks isi |
| `font-display` | Sora | Judul, angka besar, logo |

Judul: `font-display` + `tracking-[-0.02em]` hingga `-0.05em`.  
Isi: `font-sans`.

---

## 3. Tata Letak & Ukuran

| Elemen | Kelas standar |
|---|---|
| Kontainer halaman | `mx-auto w-full max-w-[1440px] overflow-x-clip bg-white` |
| Padding section | `px-[clamp(16px,4.5vw,64px)]` |
| Ukuran fluid | `clamp()` — jangan ukuran tetap (px) untuk font/lebar |
| Radius | `rounded-full` (tombol), `rounded-[18px]` (input), `rounded-[22px]`–`[64px]` (kartu/panel) |
| Mobile breakpoint | `max-[980px]:` saja |

---

## 4. Aturan Terpenting (Hindari Error)

1. **Named export untuk semua komponen.** `import Header from "@/components/Header"` **SALAH** jika komponen diexport sebagai `export function Header`. Gunakan `import { Header } from "@/components/Header"`.
2. **Hanya `app/layout.tsx` yang me-render `<html>` dan `<body>`.** Jangan buat `layout.tsx` di bawah folder fitur yang render keduanya — menyebabkan **hydration mismatch** (error yang baru saja terjadi di `/detail-pesanan/layout.tsx`).
3. **Tidak ada `Date.now()`, `Math.random()`, `new Date()`, `toLocaleString()` di render awal komponen yang di-hydrate.** Gunakan prop `now` dari server dan `lib/format.ts` untuk waktu/angka.
4. **Semua komponen perlu `metadata.title` di `page.tsx`.**
5. **Empat keadaan wajib ada** untuk tiap halaman berdata: loading, kosong, berhasil, galat.

---

## 5. Kelas Kustom (Satu-Satunya yang Boleh Ada)

Didefinisikan di `app/globals.css`: `.btn`, `.card`, `.card-img`, `.stat`, `.stripe-dark`, `.stripe-light`, `.skel`.  
Jangan buat kelas kustom baru di luar sana.

---

## 6. Ikon & Status

- Semua ikon dari `components/icons.tsx` (jangan SVG mentah di komponen).
- Status selalu berlabel teks + warna; ikon dekoratif `aria-hidden="true"`.

---

## 7. Checklist Sebelum Commit

- [ ] Tidak ada hex literal baru di komponen (kecuali daftar status di §1).
- [ ] Named export; `metadata.title` di halaman.
- [ ] Tidak ada `<html>`/`<body>` di luar `app/layout.tsx`.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` lulus.
