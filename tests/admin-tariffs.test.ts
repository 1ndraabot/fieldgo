import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES as M, analyzeCourt, analyzeRows, courtTariffsFrom, gapMessage, newRow, priceFor, requiredHours, sameTariffs, toTariffs, type TariffRow } from "../lib/admin-tariffs.ts";
import { getCourtDetail, type DayHours } from "../lib/court-detail.ts";
import { computeSlots } from "../lib/availability.ts";
import { buildTariffsData } from "../lib/mock-tariffs.ts";

const row = (s: string | number, e: string | number, p: string | number, key = `k${s}${e}`): TariffRow => ({ key, start: String(s), end: String(e), price: String(p) });
const ALL = new Array(18).fill(true);
const open = (buka: number, tutup: number, o = true): DayHours => ({ buka, tutup, open: o });
const week = (h: DayHours): DayHours[] => Array.from({ length: 7 }, () => ({ ...h }));

test("contoh PRD: 06–12 + 12–17 diperbolehkan; 06–12 + 11–17 ditolak; 17–22 + 18–23 ditolak", () => {
  assert.equal(analyzeRows([row(6, 12, 90000), row(12, 17, 90000)], ALL).hasError, false);

  const a = analyzeRows([row(6, 12, 90000), row(11, 17, 90000)], ALL);
  assert.equal(a.hasError, true);
  assert.match(a.errors[0], /tumpang tindih dengan rentang 2 \(11\.00–17\.00\)/);
  assert.match(a.errors[1], /tumpang tindih dengan rentang 1 \(06\.00–12\.00\)/);
  assert.equal(a.cells[5], "dup", "jam 11 dicakup kedua rentang");
});

test("tumpang tindih menandai sel dup pada jam yang bertabrakan saja", () => {
  const a = analyzeRows([row(6, 12, 1), row(11, 17, 1)], ALL);
  assert.deepEqual(a.cells.slice(0, 12), ["ok", "ok", "ok", "ok", "ok", "dup", "ok", "ok", "ok", "ok", "ok", "gap"]); // jam 17 belum bertarif
  const b = analyzeRows([row(17, 22, 1), row(18, 23, 1)], ALL);
  assert.equal(b.hasError, true);
  assert.deepEqual(b.cells.slice(11, 17), ["ok", "dup", "dup", "dup", "dup", "ok"]);
});

test("satu rentang yang membungkus rentang lain juga tumpang tindih; rentang identik juga", () => {
  assert.equal(analyzeRows([row(6, 24, 1), row(10, 12, 1)], ALL).hasError, true);
  assert.equal(analyzeRows([row(8, 10, 1), row(8, 10, 1)], ALL).hasError, true);
});

test("tumpang tindih dihitung per lapangan dan per tipe hari (tidak otomatis bentrok)", () => {
  const hours = week(open(6, 24));
  const court = { weekday: [row(6, 17, 90000)], weekend: [row(6, 17, 110000)] };
  assert.equal(analyzeCourt({ ...court, weekday: [...court.weekday, row(17, 24, 120000)], weekend: [...court.weekend, row(17, 24, 150000)] }, hours).hasError, false);
  // rentang yang sama pada weekday dan weekend → bukan tumpang tindih
  assert.equal(analyzeCourt({ weekday: [row(6, 24, 1)], weekend: [row(6, 24, 1)] }, hours).hasError, false);
});

test("validasi harga: > 0, bilangan bulat, wajib diisi", () => {
  assert.equal(analyzeRows([row(6, 12, 0)], ALL).errors[0], M.price);
  assert.equal(analyzeRows([row(6, 12, -5000)], ALL).errors[0], M.price);
  assert.equal(analyzeRows([row(6, 12, "")], ALL).errors[0], M.incomplete);
  assert.equal(analyzeRows([row(6, 12, "abc")], ALL).errors[0], M.integer);
  assert.equal(analyzeRows([row(6, 12, "90000.5")], ALL).errors[0], M.integer);
  assert.equal(analyzeRows([row(6, 12, 1)], ALL).errors[0], "");
});

test("validasi jam: mulai < selesai, rentang 06–24, bilangan bulat", () => {
  for (const [s, e] of [[12, 12], [17, 12], [5, 12], [6, 25], [24, 24], [23, 6]]) assert.equal(analyzeRows([row(s, e, 1)], ALL).errors[0], M.range, `${s}-${e}`);
  assert.equal(analyzeRows([row("", 12, 1)], ALL).errors[0], M.incomplete);
  assert.equal(analyzeRows([row("6.5", 12, 1)], ALL).errors[0], M.integer);
  assert.equal(analyzeRows([row(23, 24, 1)], ALL).errors[0], "");
});

test("baris yang salah tidak dihitung sebagai cakupan dan tidak memicu tumpang tindih palsu", () => {
  const a = analyzeRows([row(6, 12, 0), row(6, 12, 90000)], ALL);
  assert.deepEqual(a.errors, [M.price, ""]);
  assert.equal(a.cells[0], "ok");
});

test("cakupan jam operasional: celah dilaporkan sebagai rentang (PRD AC-20)", () => {
  const a = analyzeRows([row(6, 17, 1)], ALL);
  assert.deepEqual(a.gaps, [[17, 24]]);
  assert.equal(gapMessage(a.gaps), "Jam 17.00 sampai 24.00 belum punya tarif. Slot di jam itu tidak bisa dipesan.");
  const b = analyzeRows([row(6, 10, 1), row(12, 15, 1), row(20, 24, 1)], ALL);
  assert.deepEqual(b.gaps, [[10, 12], [15, 20]]);
  assert.equal(gapMessage(b.gaps), "Jam 10.00 sampai 12.00, 15.00 sampai 20.00 belum punya tarif. Slot di jam itu tidak bisa dipesan.");
  assert.deepEqual(analyzeRows([], ALL).gaps, [[6, 24]]);
  assert.equal(analyzeRows([row(6, 24, 1)], ALL).gaps.length, 0);
  assert.equal(gapMessage([]), "");
});

test("cakupan mengikuti jam operasional lapangan, bukan selalu 06–24", () => {
  const hours = week(open(6, 22));
  const req = requiredHours(hours, "weekday");
  assert.equal(req.filter(Boolean).length, 16);
  const a = analyzeRows([row(6, 22, 1)], req);
  assert.equal(a.gaps.length, 0);
  assert.deepEqual(a.cells.slice(16), ["off", "off"]);
  // hari tutup: tidak ada jam yang wajib bertarif
  const closedWeekend = [...week(open(6, 24)).slice(0, 5), open(6, 24, false), open(6, 24, false)];
  assert.equal(requiredHours(closedWeekend, "weekend").some(Boolean), false);
  assert.equal(analyzeRows([], requiredHours(closedWeekend, "weekend")).gaps.length, 0);
  // gabungan hari: Senin 06–22, Selasa 06–24 → perlu 06–24
  const mixed = week(open(6, 22)); mixed[1] = open(6, 24);
  assert.equal(requiredHours(mixed, "weekday").every(Boolean), true);
});

test("konversi baris ↔ tarif, urutan, dan deteksi perubahan", () => {
  const d = getCourtDetail("futsal-arena-a")!;
  const c = courtTariffsFrom(d.tariffs);
  assert.deepEqual(toTariffs(c), [...d.tariffs].sort((a, b) => (a.tipe === b.tipe ? a.mulai - b.mulai : a.tipe === "weekday" ? -1 : 1)));
  assert.equal(sameTariffs(c, courtTariffsFrom(d.tariffs)), true);
  const changed = courtTariffsFrom(d.tariffs); changed.weekday[0].price = "95000";
  assert.equal(sameTariffs(c, changed), false);
  assert.equal(analyzeCourt(c, d.hours).hasError, false);
  assert.equal(analyzeCourt(c, d.hours).hasGap, false);
});

test("baris baru: mulai setelah rentang terakhir, harga disalin", () => {
  assert.deepEqual({ ...newRow([row(6, 17, 90000)]), key: "" }, { key: "", start: "17", end: "18", price: "90000" });
  assert.deepEqual({ ...newRow([row(6, 24, 90000)]), key: "" }, { key: "", start: "6", end: "7", price: "90000" });
  assert.equal(newRow([]).price, "100000");
});

test("celah tarif konsisten dengan kalender: jam tanpa tarif tampil Tidak tersedia (AC-20)", () => {
  const d = getCourtDetail("futsal-arena-a")!;
  const c = courtTariffsFrom(d.tariffs);
  c.weekday = c.weekday.filter((r) => r.start !== "17"); // hapus tarif malam weekday
  const a = analyzeCourt(c, d.hours);
  assert.deepEqual(a.weekday.gaps, [[17, 24]]);
  const tariffs = toTariffs(c);
  const now = Date.UTC(2026, 10, 11, 0, 0); // Rabu 11 Nov 2026 07.00 WIB
  const slots = computeSlots({ ...d, tariffs }, "2026-11-12", now, { occupancy: {}, blackouts: [] }); // Kamis
  assert.ok(slots.filter((s) => s.hour >= 17).every((s) => s.status === "tidak-tersedia" && s.price === null));
  assert.ok(slots.filter((s) => s.hour >= 8 && s.hour < 17).every((s) => s.status === "tersedia"));
});

test("harga terkunci: mengubah tarif tidak mengubah pesanan lama, hanya pesanan baru (BR-06, AC-06)", () => {
  const now = Date.UTC(2026, 10, 12, 5, 43);
  const { courts, lockedOrders } = buildTariffsData(now);
  const before = JSON.stringify(lockedOrders);
  const futsal = courts.find((c) => c.id === "futsal-arena-a")!;
  const oldRate = priceFor(futsal.tariffs, "weekend", 20);
  assert.equal(oldRate, 150000);

  const edited = courtTariffsFrom(futsal.tariffs); edited.weekend.find((r) => r.start === "17")!.price = "200000";
  const newTariffs = toTariffs(edited);
  assert.equal(priceFor(newTariffs, "weekend", 20), 200000, "pesanan baru memakai tarif baru");
  assert.equal(JSON.stringify(lockedOrders), before, "pesanan lama tidak berubah");
  assert.equal(lockedOrders.find((o) => o.courtId === "futsal-arena-a" && o.total === 300000)?.total, 300000);
});

test("data contoh: semua lapangan lengkap tanpa celah/tumpang tindih; ada pesanan terkunci", () => {
  const { courts, lockedOrders } = buildTariffsData(Date.UTC(2026, 10, 12, 5, 43));
  assert.equal(courts.length, 6);
  for (const c of courts) { const a = analyzeCourt(courtTariffsFrom(c.tariffs), c.hours); assert.equal(a.hasError || a.hasGap, false, c.name); }
  assert.ok(lockedOrders.length >= 3);
});
