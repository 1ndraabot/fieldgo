import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// DB sementara (file) agar uji balapan lintas-proses bisa memakai file yang sama.
const here = path.dirname(fileURLToPath(import.meta.url));
process.env.DATABASE_PATH ??= path.join(here, "test.db");

const { createBooking, parseInput } = await import("../lib/server/bookings.ts");
const { getDb } = await import("../lib/server/db.ts");
const { getDaySlots, loadCourtDetail } = await import("../lib/server/repo.ts");
const { BookingError } = await import("../lib/booking-errors.ts");
const { paymentDeadlineMs } = await import("../lib/payment-deadline.ts");
const { addDays, wibNow } = await import("../lib/datetime.ts");

const db = getDb();
// Rabu 11 Nov 2026 10:00 WIB (UTC+7) → 03:00 UTC
const NOW = Date.UTC(2026, 10, 11, 3, 0);
const TODAY = wibNow(NOW).dateISO;
const VERIFIED = 1, UNVERIFIED = 2;

/** Cari tanggal ke depan yang seluruh jamnya tersedia untuk rentang tertentu (data demo berbasis hash). */
function findFreeRange(courtId: string, hours: number[], fromOffset = 2) {
  for (let i = fromOffset; i < 40; i++) {
    const d = addDays(TODAY, i);
    const slots = getDaySlots(courtId, d, NOW)!;
    if (hours.every((h) => slots.find((s) => s.hour === h)?.status === "tersedia")) return d;
  }
  throw new Error("tidak ada tanggal kosong");
}
const code = (fn: () => unknown) => { try { fn(); } catch (e) { return e instanceof BookingError ? e.code : String(e); } return "OK"; };

test("tamu & akun belum verifikasi ditolak (BR-02)", () => {
  const d = findFreeRange("futsal-arena-a", [20, 21]);
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: d, jam: [20] }, null, NOW)), "UNAUTHENTICATED");
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: d, jam: [20] }, UNVERIFIED, NOW)), "EMAIL_NOT_VERIFIED");
});

test("validasi input: bentuk, tanggal tidak nyata, jam di luar rentang, duplikat", () => {
  for (const bad of [null, {}, { lapangan: "x", tanggal: "2026-13-40", jam: [9] }, { lapangan: "futsal-arena-a", tanggal: TODAY, jam: [5] },
    { lapangan: "futsal-arena-a", tanggal: TODAY, jam: [24] }, { lapangan: "futsal-arena-a", tanggal: TODAY, jam: [9, 9] },
    { lapangan: "futsal-arena-a", tanggal: TODAY, jam: [] }, { lapangan: "futsal-arena-a", tanggal: TODAY, jam: [9.5] }]) {
    assert.equal(code(() => parseInput(bad)), "INVALID_INPUT", JSON.stringify(bad));
  }
});

test("jam tidak berurutan ditolak (AC-04) dan lapangan tak dikenal 404", () => {
  const d = findFreeRange("futsal-arena-a", [9, 11]);
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: d, jam: [9, 11] }, VERIFIED, NOW)), "NOT_CONTIGUOUS");
  assert.equal(code(() => createBooking({ lapangan: "tidak-ada", tanggal: d, jam: [9] }, VERIFIED, NOW)), "COURT_NOT_FOUND");
});

test("tanggal/jam lampau ditolak (FR-ORD-05)", () => {
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: addDays(TODAY, -1), jam: [20] }, VERIFIED, NOW)), "SLOT_PAST");
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: TODAY, jam: [9] }, VERIFIED, NOW)), "SLOT_PAST");
});

test("di luar jam operasional & slot diblokir → tidak tersedia (BR-05, blacklist)", () => {
  // Basket tutup 22.00
  const d = addDays(TODAY, 2);
  assert.equal(code(() => createBooking({ lapangan: "basket-outdoor", tanggal: d, jam: [22] }, VERIFIED, NOW)), "SLOT_UNAVAILABLE");
  // blacklist futsal (tanggal & jam dibaca dari basis data)
  const b = db.prepare("SELECT tanggal_mulai AS t, jam_mulai AS j FROM blokir_jadwal WHERE lapangan_id='futsal-arena-a'").get()!;
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: String(b.t), jam: [Number(b.j)] }, VERIFIED, NOW)), "SLOT_UNAVAILABLE");
});

test("slot tanpa tarif tidak bisa dipesan (BR-15)", () => {
  db.exec("DELETE FROM tarif WHERE lapangan_id='tenis-lapangan-1' AND jam_mulai=17");
  const d = addDays(TODAY, 2);
  assert.equal(code(() => createBooking({ lapangan: "tenis-lapangan-1", tanggal: d, jam: [18] }, VERIFIED, NOW)), "SLOT_UNAVAILABLE");
  db.exec("INSERT INTO tarif (lapangan_id,tipe_hari,jam_mulai,jam_selesai,harga_per_jam) VALUES ('tenis-lapangan-1','weekday',17,24,110000)");
});

test("pesanan sukses: kode, status, harga per jam melewati dua tarif (AC-05), batas bayar, riwayat", () => {
  const d = findFreeRange("futsal-arena-a", [16, 17]);
  const o = createBooking({ lapangan: "futsal-arena-a", tanggal: d, jam: [17, 16], total: 1, harga: 1, status: "terkonfirmasi", pengguna_id: 3 }, VERIFIED, NOW);
  const weekend = [5, 6].includes((new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7);
  assert.equal(o.totalHarga, weekend ? 110000 + 150000 : 90000 + 120000, "total dihitung server, bukan dari klien");
  assert.match(o.kode, /^GH-[2-9A-HJKMNP-Z]{6}$/);
  const row = db.prepare("SELECT * FROM pesanan WHERE kode_pesanan=?").get(o.kode)!;
  assert.equal(row.status, "menunggu_pembayaran");
  assert.equal(row.pengguna_id, VERIFIED, "identitas dari sesi, bukan body");
  assert.equal(row.jam_mulai, 16); assert.equal(row.jam_selesai, 18); assert.equal(row.jumlah_jam, 2);
  assert.equal(row.batas_bayar_pada, NOW + 24 * 3600_000, "24 jam < jam main");
  const slots = db.prepare("SELECT jam,harga_per_jam,aktif FROM slot_pesanan WHERE pesanan_id=? ORDER BY jam").all(o.id);
  assert.deepEqual(slots.map((s) => [s.jam, s.aktif]), [[16, 1], [17, 1]]);
  assert.equal(slots[0].harga_per_jam, weekend ? 110000 : 90000);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM riwayat_status WHERE pesanan_id=?").get(o.id)!.n, 1);
  // slot kini ditahan di kalender
  const after = getDaySlots("futsal-arena-a", d, NOW)!;
  assert.equal(after.find((s) => s.hour === 16)!.status, "ditahan");
});

test("harga terkunci: ubah tarif setelah pesan tidak mengubah pesanan lama (AC-06)", () => {
  const d = findFreeRange("badminton-court-1", [10]);
  const o = createBooking({ lapangan: "badminton-court-1", tanggal: d, jam: [10] }, VERIFIED, NOW);
  db.exec("UPDATE tarif SET harga_per_jam = harga_per_jam * 2 WHERE lapangan_id='badminton-court-1'");
  assert.equal(db.prepare("SELECT total_harga FROM pesanan WHERE id=?").get(o.id)!.total_harga, o.totalHarga);
  assert.equal(db.prepare("SELECT harga_per_jam FROM slot_pesanan WHERE pesanan_id=?").get(o.id)!.harga_per_jam, o.totalHarga);
  db.exec("UPDATE tarif SET harga_per_jam = harga_per_jam / 2 WHERE lapangan_id='badminton-court-1'");
});

test("pesan slot yang sama dua kali → kedua ditolak SLOT_TAKEN (BR-01, AC-01)", () => {
  const d = findFreeRange("mini-soccer", [8, 9]);
  createBooking({ lapangan: "mini-soccer", tanggal: d, jam: [8, 9] }, VERIFIED, NOW);
  assert.equal(code(() => createBooking({ lapangan: "mini-soccer", tanggal: d, jam: [9] }, 3, NOW)), "SLOT_TAKEN");
  // atomik: pesanan gagal tidak meninggalkan baris sisa
  const orphan = db.prepare("SELECT COUNT(*) AS n FROM pesanan p WHERE NOT EXISTS (SELECT 1 FROM slot_pesanan s WHERE s.pesanan_id=p.id)").get()!.n;
  assert.equal(orphan, 0);
});

test("constraint basis data menolak double booking walau pemeriksaan aplikasi dilewati", () => {
  const d = findFreeRange("badminton-court-2", [14]);
  const o = createBooking({ lapangan: "badminton-court-2", tanggal: d, jam: [14] }, VERIFIED, NOW);
  assert.throws(() => db.prepare("INSERT INTO slot_pesanan (pesanan_id,lapangan_id,tanggal,jam,harga_per_jam,aktif) VALUES (?,?,?,?,1,1)").run(o.id, "badminton-court-2", d, 14), /UNIQUE/);
});

test("kedaluwarsa melepas slot dan slot bisa dipesan lagi (BR-09, AC-09)", () => {
  const d = findFreeRange("basket-outdoor", [8]);
  const o = createBooking({ lapangan: "basket-outdoor", tanggal: d, jam: [8] }, VERIFIED, NOW);
  const later = o.batasBayarPada + 60_000;
  assert.equal(getDaySlots("basket-outdoor", d, later)!.find((s) => s.hour === 8)!.status, "tersedia", "kalender langsung melepas");
  const o2 = createBooking({ lapangan: "basket-outdoor", tanggal: d, jam: [8] }, 3, later);
  assert.ok(o2.id !== o.id);
  assert.equal(db.prepare("SELECT status FROM pesanan WHERE id=?").get(o.id)!.status, "kedaluwarsa");
});

test("batas bayar = min(24 jam, jam main) (AC-07)", () => {
  const created = Date.UTC(2026, 10, 11, 13, 0); // 20.00 WIB
  assert.equal(paymentDeadlineMs(created, "2026-11-12", 8), Date.UTC(2026, 10, 12, 1, 0)); // 08.00 WIB esok
  assert.equal(paymentDeadlineMs(created, "2026-11-20", 8), created + 24 * 3600_000);
});

test("akun nonaktif ditolak", () => {
  db.prepare("UPDATE pengguna SET dinonaktifkan_pada=? WHERE id=3").run(NOW);
  const d = findFreeRange("futsal-arena-a", [7]);
  assert.equal(code(() => createBooking({ lapangan: "futsal-arena-a", tanggal: d, jam: [7] }, 3, NOW)), "ACCOUNT_DISABLED");
  db.prepare("UPDATE pengguna SET dinonaktifkan_pada=NULL WHERE id=3").run();
});

test("lapangan nonaktif ditolak", () => {
  db.exec("UPDATE lapangan SET aktif=0 WHERE id='tenis-lapangan-1'");
  assert.equal(code(() => createBooking({ lapangan: "tenis-lapangan-1", tanggal: addDays(TODAY, 2), jam: [9] }, VERIFIED, NOW)), "COURT_INACTIVE");
  db.exec("UPDATE lapangan SET aktif=1 WHERE id='tenis-lapangan-1'");
  assert.ok(loadCourtDetail("tenis-lapangan-1"));
});

test("balapan dua proses pada slot yang sama: tepat satu berhasil (AC-01)", async () => {
  const d = findFreeRange("futsal-arena-a", [6]);
  const child = () => new Promise<string>((resolve) => {
    const p = spawn(process.execPath, [path.join(here, "race-child.ts"), d], { env: process.env });
    let out = ""; p.stdout.on("data", (c) => (out += c)); p.on("close", () => resolve(out.trim()));
  });
  const results = await Promise.all([child(), child(), child()]);
  assert.equal(results.filter((r) => r === "OK").length, 1, results.join(","));
  assert.equal(results.filter((r) => r === "SLOT_TAKEN").length, 2, results.join(","));
});

test("seleksi halaman Pesan: berurutan, ujung boleh dilepas, tengah ditolak (AC-04)", async () => {
  const { toggleHourStrict, STRICT_NOT_CONTIGUOUS_MSG, RELEASE_END_MSG } = await import("../lib/selection.ts");
  let r = toggleHourStrict([], 9);
  r = toggleHourStrict(r.hours, 11);
  assert.deepEqual(r.hours, [9]); assert.equal(r.error, STRICT_NOT_CONTIGUOUS_MSG);
  r = toggleHourStrict([9], 10); r = toggleHourStrict(r.hours, 11);
  assert.deepEqual(r.hours, [9, 10, 11]);
  assert.equal(toggleHourStrict([9, 10, 11], 10).error, RELEASE_END_MSG);
  assert.deepEqual(toggleHourStrict([9, 10, 11], 11).hours, [9, 10]);
  assert.deepEqual(toggleHourStrict([9, 10, 11], 8).hours, [8, 9, 10, 11]);
});

test("query dari halaman Detail divalidasi server: valid dipakai, tidak valid dibuang dengan catatan", async () => {
  const { loadPesanInitial } = await import("../lib/server/pesan-data.ts");
  const d = findFreeRange("futsal-arena-a", [16, 17]);
  const ok = loadPesanInitial({ lapangan: "futsal-arena-a", tanggal: d, jam: "16,17" }, NOW)!;
  assert.deepEqual([ok.courtId, ok.date, ok.hours, ok.note], ["futsal-arena-a", d, [16, 17], null]);
  assert.equal(ok.slots.length, 18);
  const gap = loadPesanInitial({ lapangan: "futsal-arena-a", tanggal: d, jam: "16,18" }, NOW)!;
  assert.deepEqual(gap.hours, []); assert.ok(gap.note);
  const past = loadPesanInitial({ lapangan: "futsal-arena-a", tanggal: addDays(TODAY, -2), jam: "16" }, NOW)!;
  assert.equal(past.date, TODAY); assert.ok(past.note);
  const unknown = loadPesanInitial({ lapangan: "nope" }, NOW)!;
  assert.equal(unknown.courtId, unknown.courts[0].id);
  assert.equal(loadPesanInitial({}, NOW)!.fromQuery, false);
});

test("kalender publik tidak membocorkan data pemilik (hanya status)", () => {
  const d = findFreeRange("futsal-arena-a", [18]);
  const json = JSON.stringify(getDaySlots("futsal-arena-a", d, NOW));
  assert.ok(!/pengguna|nama|email|kontak|kode|GH-|DM-/i.test(json));
});
