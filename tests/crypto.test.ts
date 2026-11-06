import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, buatToken, hashToken } from '../lib/auth/crypto.ts';

test('hash sandi: format scrypt, salt acak, verifikasi benar/salah', async () => {
  const h1 = await hashPassword('Lapangan24!');
  const h2 = await hashPassword('Lapangan24!');
  assert.match(h1, /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.notEqual(h1, h2); // salt berbeda
  assert.ok(!h1.includes('Lapangan24!'));
  assert.equal(await verifyPassword('Lapangan24!', h1), true);
  assert.equal(await verifyPassword('lapangan24!', h1), false);
});

test('verifyPassword menolak format hash yang rusak tanpa melempar galat', async () => {
  for (const rusak of ['', 'plain', 'scrypt$1$2', 'bcrypt$x$y$z$a$b'])
    assert.equal(await verifyPassword('x', rusak), false, rusak);
});

test('token acak: unik, cukup panjang, hash deterministik dan berbeda dari token', () => {
  const a = buatToken();
  const b = buatToken();
  assert.notEqual(a.token, b.token);
  assert.ok(a.token.length >= 43); // 32 byte base64url
  assert.equal(a.hash, hashToken(a.token));
  assert.notEqual(a.hash, a.token);
  assert.match(a.hash, /^[0-9a-f]{64}$/);
});
