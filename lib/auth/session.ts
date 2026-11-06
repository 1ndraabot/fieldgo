import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NAMA_COOKIE } from './cookie.ts';
import { auth } from './deps.ts';
import { ambilPengguna } from './service.ts';

/** Pengguna dari cookie sesi, atau null. Hanya dipanggil di server (komponen server / route). */
export async function penggunaSaatIni() {
  const token = (await cookies()).get(NAMA_COOKIE)?.value ?? null;
  return ambilPengguna(auth, token);
}

/** Halaman khusus penyewa: tamu diarahkan ke /masuk lalu dikembalikan ke `kembaliKe` (FR-PUB-05). */
export async function wajibPenyewa(kembaliKe: string) {
  const p = await penggunaSaatIni();
  if (!p || p.peran !== 'penyewa') redirect(`/masuk?next=${encodeURIComponent(kembaliKe)}`);
  return p;
}
