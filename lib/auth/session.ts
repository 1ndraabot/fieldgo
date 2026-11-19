import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO, DEMO_PENGGUNA } from '../demo.ts';
import { bacaCookie, NAMA_COOKIE } from './cookie.ts';
import { auth } from './deps.ts';
import { ambilPengguna } from './service.ts';

/** Pengguna dari cookie sesi, atau null. Hanya dipanggil di server (komponen server / route). */
export async function penggunaSaatIni() {
  if (DEMO) return DEMO_PENGGUNA; // tanpa database: anggap sudah masuk sebagai pengguna contoh
  const token = (await cookies()).get(NAMA_COOKIE)?.value ?? null;
  return ambilPengguna(auth, token);
}

/** Versi route handler: membaca cookie dari header Request, bukan `next/headers`. */
export async function penggunaDari(req: Request) {
  if (DEMO) return DEMO_PENGGUNA;
  return ambilPengguna(auth, bacaCookie(req.headers.get('cookie'), NAMA_COOKIE));
}

/** Pengguna admin dari sesi request, atau null (dipakai guard API). */
export async function adminDari(req: Request) {
  const p = await penggunaDari(req);
  return p?.peran === 'admin' ? p : null;
}

/** Halaman khusus penyewa: tamu diarahkan ke /masuk lalu dikembalikan ke `kembaliKe` (FR-PUB-05). */
export async function wajibPenyewa(kembaliKe: string) {
  const p = await penggunaSaatIni();
  if (!p || p.peran !== 'penyewa') redirect(`/masuk?next=${encodeURIComponent(kembaliKe)}`);
  return p;
}

/** Halaman panel admin (FR-ADM-01): tamu/penyewa diarahkan ke /admin/masuk lalu dikembalikan ke `kembaliKe`. */
export async function wajibAdmin(kembaliKe: string) {
  const p = await penggunaSaatIni();
  if (!p || p.peran !== 'admin') redirect(`/admin/masuk?next=${encodeURIComponent(kembaliKe)}`);
  return p;
}
