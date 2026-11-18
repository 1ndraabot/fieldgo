import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES as M, TEXT_MAX, parseRefund, relativeTime, sortOldestFirst, statusAfterCancellation, statusAfterPayment, validateCancelDecision, validateRejectReason } from "../lib/admin-verification.ts";
import { buildVerificationData } from "../lib/mock-verification.ts";
import { dayIndex, wibNow } from "../lib/datetime.ts";

test("transisi status sesuai PRD", () => {
  assert.equal(statusAfterPayment("approved"), "terkonfirmasi");
  assert.equal(statusAfterPayment("rejected"), "ditolak");
  assert.equal(statusAfterCancellation("approved"), "dibatalkan");
  assert.equal(statusAfterCancellation("rejected"), "terkonfirmasi");
});

test("alasan penolakan bukti wajib (AC-11): kosong/spasi ditolak, batas panjang", () => {
  assert.equal(validateRejectReason(""), M.reasonRequired);
  assert.equal(validateRejectReason("   \n "), M.reasonRequired);
  assert.equal(validateRejectReason("Nominal tidak sesuai"), null);
  assert.equal(validateRejectReason("x".repeat(TEXT_MAX)), null);
  assert.equal(validateRejectReason("x".repeat(TEXT_MAX + 1)), M.tooLong);
});

test("nominal refund: kosong = tanpa refund, format angka, batas total dibayar", () => {
  assert.deepEqual(parseRefund("", 85000), { ok: true, amount: null });
  assert.deepEqual(parseRefund("0", 85000), { ok: true, amount: null });
  assert.deepEqual(parseRefund("85000", 85000), { ok: true, amount: 85000 });
  assert.deepEqual(parseRefund("85.000", 85000), { ok: true, amount: 85000 });
  assert.deepEqual(parseRefund("Rp 40.000", 85000), { ok: true, amount: 40000 });
  assert.deepEqual(parseRefund("85001", 85000), { ok: false, message: "Jumlah refund tidak boleh melebihi total dibayar (Rp 85.000)." });
  for (const bad of ["abc", "-5", "1,5", "12.34", "1e3", "50 000"]) assert.deepEqual(parseRefund(bad, 85000), { ok: false, message: M.refundDigits }, bad);
});

test("keputusan pembatalan: catatan selalu wajib; refund hanya diperiksa saat menyetujui", () => {
  const base = { maxRefund: 85000, refundInput: "", note: "" };
  assert.deepEqual(validateCancelDecision({ ...base, result: "approved" }), { note: M.noteRequired });
  assert.deepEqual(validateCancelDecision({ ...base, result: "rejected" }), { note: M.noteRequired });
  assert.deepEqual(validateCancelDecision({ ...base, result: "approved", note: "Sesuai kebijakan", refundInput: "99999999" }).refund?.startsWith("Jumlah refund"), true);
  assert.deepEqual(validateCancelDecision({ ...base, result: "rejected", note: "Melewati batas", refundInput: "ngawur" }), {});
  assert.deepEqual(validateCancelDecision({ ...base, result: "approved", note: "Disetujui", refundInput: "40000" }), {});
});

test("waktu relatif", () => {
  const now = 10_000_000_000;
  assert.equal(relativeTime(now - 20_000, now), "baru saja");
  assert.equal(relativeTime(now - 25 * 60_000, now), "25 menit lalu");
  assert.equal(relativeTime(now - 3 * 3600_000, now), "3 jam lalu");
  assert.equal(relativeTime(now - 50 * 3600_000, now), "2 hari lalu");
});

test("data contoh: antrean terurut terlama dulu, total = jumlah tarif, tanggal di masa depan, kode unik", () => {
  const now = Date.UTC(2026, 10, 12, 5, 43);
  const d = buildVerificationData(now);
  const today = wibNow(now).dateISO;
  assert.deepEqual(sortOldestFirst(d.payments, (p) => p.uploadedAtMs).map((p) => p.kode), d.payments.map((p) => p.kode));
  assert.deepEqual(sortOldestFirst(d.cancellations, (p) => p.diajukanAtMs).map((p) => p.kode), d.cancellations.map((p) => p.kode));
  for (const o of [...d.payments, ...d.cancellations]) { assert.ok(o.date > today, o.kode); assert.ok(o.total > 0); assert.match(o.kode, /^GH-[2-9A-HJKMNP-Z]{6}$/); }
  assert.equal(new Set([...d.payments, ...d.cancellations].map((o) => o.kode)).size, 6);
  assert.equal(d.payments[0].total, 300000);                      // Futsal Sabtu malam 2 × 150.000
  assert.equal(dayIndex(d.payments[0].date), 5);
  assert.equal(d.payments[2].total, 90000 + 115000);              // Basket Minggu 16.00 + 17.00 (dua tarif)
  assert.ok(d.payments.every((p) => p.proof.amount === p.total));
  assert.ok(d.payments.some((p) => p.proof.kind === "pdf") && d.payments.some((p) => p.proof.kind === "image"));
});
