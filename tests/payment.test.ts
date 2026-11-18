import test from "node:test";
import assert from "node:assert/strict";
import { checkMeta, formatBytes, MAX_PROOF_BYTES, PROOF_MESSAGES, sniff, validateProofFile } from "../lib/proof-file.ts";
import { createdLabel, dateLong, deadlineLong, formatHMS, remainingSeconds } from "../lib/payment-format.ts";
import { buildMockOrder } from "../lib/mock-order.ts";
import { dayIndex, wibNow } from "../lib/datetime.ts";
import { paymentDeadlineMs } from "../lib/payment-deadline.ts";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const file = (bytes: number[], name: string, type: string, pad = 0) =>
  new File([new Uint8Array([...bytes, ...new Array(pad).fill(0)])], name, { type });

test("berkas JPG, JPEG, PNG, dan PDF yang valid diterima", async () => {
  assert.deepEqual(await validateProofFile(file(JPEG, "bukti.jpg", "image/jpeg")), { ok: true, kind: "image" });
  assert.deepEqual(await validateProofFile(file(JPEG, "BUKTI.JPEG", "image/jpeg")), { ok: true, kind: "image" });
  assert.deepEqual(await validateProofFile(file(PNG, "bukti.png", "image/png")), { ok: true, kind: "image" });
  assert.deepEqual(await validateProofFile(file(PDF, "bukti.pdf", "application/pdf")), { ok: true, kind: "pdf" });
  // tipe MIME kosong (beberapa peramban) tetap diterima bila ekstensi & isi cocok
  assert.deepEqual(await validateProofFile(file(PNG, "bukti.png", "")), { ok: true, kind: "image" });
});

test("format tidak didukung ditolak dengan pesan jelas", async () => {
  for (const [n, t] of [["a.gif", "image/gif"], ["a.webp", "image/webp"], ["a.docx", "application/msword"], ["a", ""], ["a.png", "application/pdf"], ["a.txt", "text/plain"]] as const) {
    assert.deepEqual(await validateProofFile(file(PNG, n, t)), { ok: false, message: PROOF_MESSAGES.format }, n);
  }
});

test("batas ukuran 5 MB: tepat 5 MB lolos, lebih ditolak, kosong ditolak", () => {
  assert.equal(checkMeta({ name: "a.pdf", type: "application/pdf", size: MAX_PROOF_BYTES }).ok, true);
  assert.deepEqual(checkMeta({ name: "a.pdf", type: "application/pdf", size: MAX_PROOF_BYTES + 1 }), { ok: false, message: PROOF_MESSAGES.size });
  assert.deepEqual(checkMeta({ name: "a.png", type: "image/png", size: 0 }), { ok: false, message: PROOF_MESSAGES.empty });
});

test("isi berkas harus sesuai formatnya (menolak file yang hanya diganti ekstensi)", async () => {
  assert.deepEqual(await validateProofFile(file(PDF, "palsu.png", "image/png")), { ok: false, message: PROOF_MESSAGES.mismatch });
  assert.deepEqual(await validateProofFile(file([1, 2, 3, 4, 5, 6, 7, 8], "x.jpg", "image/jpeg")), { ok: false, message: PROOF_MESSAGES.mismatch });
  assert.equal(sniff(new Uint8Array(JPEG)), "jpeg"); assert.equal(sniff(new Uint8Array(PNG)), "png"); assert.equal(sniff(new Uint8Array(PDF)), "pdf");
});

test("format ukuran berkas", () => {
  assert.equal(formatBytes(200), "1 KB"); assert.equal(formatBytes(245_760), "240 KB"); assert.equal(formatBytes(1_258_291), "1,2 MB");
});

test("countdown: HH:MM:SS, sisa detik tidak negatif, berhenti di 0", () => {
  assert.equal(formatHMS(23 * 3600 + 41 * 60 + 8), "23:41:08");
  assert.equal(formatHMS(0), "00:00:00"); assert.equal(formatHMS(-5), "00:00:00");
  assert.equal(remainingSeconds(10_000, 4_500), 6); assert.equal(remainingSeconds(10_000, 10_000), 0); assert.equal(remainingSeconds(10_000, 99_999), 0);
});

test("label tanggal/waktu WIB", () => {
  const ms = Date.UTC(2026, 10, 5, 5, 0); // 5 Nov 2026 12.00 WIB
  assert.equal(deadlineLong(ms), "Kamis, 5 Nov 2026 · 12.00 WIB");
  assert.equal(createdLabel(Date.UTC(2026, 10, 4, 5, 0)), "4 Nov 2026, 12.00 WIB");
  assert.equal(dateLong("2026-11-07"), "Sabtu, 7 Nov 2026");
});

test("data contoh konsisten: total = jumlah harga per jam, Sabtu di masa depan, sisa ±23:41", () => {
  const now = Date.UTC(2026, 10, 12, 5, 43, 8);
  const o = buildMockOrder("GH-ABC234", now);
  assert.equal(o.kode, "GH-ABC234");
  assert.equal(o.total, o.ratePerHour.reduce((a, b) => a + b, 0)); assert.equal(o.total, 300000);
  assert.equal(dayIndex(o.date), 5); assert.ok(o.date > wibNow(now).dateISO);
  assert.equal(o.deadlineMs, paymentDeadlineMs(o.createdAtMs, o.date, 20, 24));
  assert.equal(formatHMS(remainingSeconds(o.deadlineMs, now)), "23:41:08");
  assert.equal(buildMockOrder("X", now, { remainingSec: 15 }).deadlineMs, now + 15_000);
});
