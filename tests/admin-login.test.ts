import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_LOGIN_MESSAGES as M, DEMO_ADMIN, LOCK_SECONDS, MAX_ATTEMPTS, formatMMSS, simulateAdminLogin, validateAdminLogin } from "../lib/admin-login.ts";

test("field wajib: email dan kata sandi kosong", () => {
  assert.deepEqual(validateAdminLogin({ email: "", password: "" }), { email: M.emailRequired, password: M.passwordRequired });
  assert.deepEqual(validateAdminLogin({ email: "   ", password: "x" }), { email: M.emailRequired });
});

test("format email: tanpa @, tanpa domain, spasi, terlalu panjang", () => {
  for (const bad of ["admin", "admin@", "@gelanggang.id", "admin@gelanggang", "ad min@gelanggang.id", "a@b@c.id", `${"a".repeat(250)}@x.id`]) {
    assert.deepEqual(validateAdminLogin({ email: bad, password: "x" }), { email: M.emailFormat }, bad);
  }
  assert.deepEqual(validateAdminLogin({ email: "  Admin@Gelanggang.ID ", password: "x" }), {});
});

test("kata sandi tidak di-trim (spasi dihitung sebagai isi)", () => {
  assert.deepEqual(validateAdminLogin({ email: "a@b.id", password: " " }), {});
});

test("simulasi login: akun contoh berhasil (email tak peka huruf besar), selain itu gagal", async () => {
  assert.deepEqual(await simulateAdminLogin({ ...DEMO_ADMIN }, 0), { ok: true });
  assert.deepEqual(await simulateAdminLogin({ email: " ADMIN@gelanggang.id", password: DEMO_ADMIN.password }, 0), { ok: true });
  assert.deepEqual(await simulateAdminLogin({ email: DEMO_ADMIN.email, password: "salah" }, 0), { ok: false });
  assert.deepEqual(await simulateAdminLogin({ email: DEMO_ADMIN.email, password: DEMO_ADMIN.password.toUpperCase() }, 0), { ok: false }, "kata sandi peka huruf besar");
  assert.deepEqual(await simulateAdminLogin({ email: "penyewa@example.com", password: DEMO_ADMIN.password }, 0), { ok: false });
});

test("pembatasan & format waktu", () => {
  assert.equal(MAX_ATTEMPTS, 5); assert.equal(LOCK_SECONDS, 300);
  assert.equal(formatMMSS(272), "04:32"); assert.equal(formatMMSS(300), "05:00"); assert.equal(formatMMSS(0), "00:00"); assert.equal(formatMMSS(-3), "00:00");
});
