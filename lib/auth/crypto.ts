import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

type ScryptOpts = { N: number; r: number; p: number };
const scrypt = (pw: string, salt: Buffer, len: number, o: ScryptOpts) =>
  new Promise<Buffer>((ok, gagal) => scryptCb(pw, salt, len, o, (e: Error | null, k: Buffer) => (e ? gagal(e) : ok(k))));

const N = 16384, R = 8, P = 1, LEN = 64;

/** Format: scrypt$N$r$p$salt(base64)$hash(base64). Parameter ikut disimpan agar bisa dinaikkan nanti. */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(pw, salt, LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${h.toString('base64')}`;
}

export async function verifyPassword(pw: string, tersimpan: string): Promise<boolean> {
  try {
    const [algo, n, r, p, salt, hash] = tersimpan.split('$');
    if (algo !== 'scrypt' || !hash) return false;
    const o = { N: Number(n), r: Number(r), p: Number(p) };
    if (![o.N, o.r, o.p].every(Number.isInteger) || o.N > 2 ** 20 || o.N < 2) return false;
    const harapan = Buffer.from(hash, 'base64');
    const hasil = await scrypt(pw, Buffer.from(salt, 'base64'), harapan.length, o);
    return harapan.length > 0 && timingSafeEqual(hasil, harapan);
  } catch {
    return false;
  }
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Token mentah dikirim ke pengguna (email/cookie); hanya hash-nya yang disimpan di basis data. */
export function buatToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}
