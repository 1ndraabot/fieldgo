import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buatLimiter } from '../lib/auth/ratelimit.ts';
import { cookieSesi, cookieHapus, bacaCookie } from '../lib/auth/cookie.ts';

test('limiter: batas per jendela geser, hitung mundur, kunci independen, reset', () => {
  let t = 0;
  const l = buatLimiter({ maks: 3, jendelaMs: 60_000, sekarang: () => t });
  assert.equal(l.cek('a').diizinkan, true);
  assert.equal(l.cek('a').diizinkan, true);
  assert.equal(l.cek('a').diizinkan, true);
  t = 10_000;
  assert.deepEqual(l.cek('a'), { diizinkan: false, ulangiDetik: 50 });
  assert.equal(l.cek('b').diizinkan, true); // kunci lain tidak terpengaruh
  t = 60_000; // hit pertama (t=0) sudah keluar jendela
  assert.equal(l.cek('a').diizinkan, true);
  l.reset('a');
  assert.equal(l.cek('a').diizinkan, true);
});

test('limiter: percobaan yang ditolak tidak memperpanjang hukuman', () => {
  let t = 0;
  const l = buatLimiter({ maks: 1, jendelaMs: 60_000, sekarang: () => t });
  l.cek('k');
  for (t = 1000; t < 30_000; t += 1000) l.cek('k'); // spam ditolak
  t = 60_000;
  assert.equal(l.cek('k').diizinkan, true);
});

test('cookie sesi: atribut aman, Secure opsional, hapus, baca', () => {
  assert.equal(cookieSesi('abc', 604800, false), 'sesi=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800');
  assert.ok(cookieSesi('abc', 10, true).endsWith('; Secure'));
  assert.equal(cookieHapus(false), 'sesi=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  assert.equal(bacaCookie('a=1; sesi=tok123; b=2', 'sesi'), 'tok123');
  assert.equal(bacaCookie('a=1', 'sesi'), null);
  assert.equal(bacaCookie(null, 'sesi'), null);
  assert.equal(bacaCookie('xsesi=1; sesi=ok', 'sesi'), 'ok'); // tidak salah cocok dengan nama yang mirip
});
