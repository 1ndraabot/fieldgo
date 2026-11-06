export const NAMA_COOKIE = 'sesi';
const ATRIBUT = 'Path=/; HttpOnly; SameSite=Lax';

export const cookieSesi = (token: string, maxAgeDetik: number, secure: boolean) =>
  `${NAMA_COOKIE}=${token}; ${ATRIBUT}; Max-Age=${maxAgeDetik}${secure ? '; Secure' : ''}`;

export const cookieHapus = (secure: boolean) => `${NAMA_COOKIE}=; ${ATRIBUT}; Max-Age=0${secure ? '; Secure' : ''}`;

export function bacaCookie(header: string | null, nama: string): string | null {
  for (const bagian of (header ?? '').split(';')) {
    const i = bagian.indexOf('=');
    if (i > 0 && bagian.slice(0, i).trim() === nama) return bagian.slice(i + 1).trim() || null;
  }
  return null;
}
