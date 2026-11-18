import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES as M, allClosed, applyMondayToAll, barPercent, cloneWeek, describeChanges, hasErrors, isNarrowing, sameWeek, saveWeek, standardWeek, summarize, validateDay, validateWeek } from "../lib/admin-hours.ts";
import { getCourtDetail, type DayHours } from "../lib/court-detail.ts";
import { analyzeCourt, courtTariffsFrom } from "../lib/admin-tariffs.ts";
import { computeSlots } from "../lib/availability.ts";
import { buildHoursData } from "../lib/mock-hours.ts";

const d = (buka: number, tutup: number, open = true): DayHours => ({ buka, tutup, open });

test("standar awal 06.00–24.00 setiap hari, 7 hari", () => {
  const w = standardWeek();
  assert.equal(w.length, 7);
  assert.ok(w.every((x) => x.open && x.buka === 6 && x.tutup === 24));
  assert.equal(hasErrors(w), false);
  assert.notEqual(standardWeek()[0], standardWeek()[0], "setiap panggilan menghasilkan objek baru");
});

test("jam tutup sampai 24.00 didukung; slot terakhir 23.00–24.00", () => {
  assert.equal(validateDay(d(6, 24)), null);
  assert.equal(validateDay(d(23, 24)), null);
});

test("batas 06.00–24.00: di luar rentang atau bukan bilangan bulat ditolak", () => {
  for (const [b, t] of [[5, 12], [0, 12], [6, 25], [12, 30], [6.5, 12], [8, 22.5]] as const) assert.equal(validateDay(d(b, t)), M.range, `${b}-${t}`);
});

test("jam tutup harus lebih besar dari jam buka", () => {
  for (const [b, t] of [[12, 12], [22, 8], [23, 6], [24, 24]] as const) assert.equal(validateDay(d(b, t)), M.order, `${b}-${t}`);
  assert.equal(validateDay(d(8, 9)), null);
});

test("hari tutup tidak divalidasi (jam diabaikan); validasi per hari", () => {
  assert.equal(validateDay(d(22, 8, false)), null);
  const w = standardWeek(); w[2] = d(10, 10); w[6] = d(20, 5, false);
  assert.deepEqual(validateWeek(w), [null, null, M.order, null, null, null, null]);
  assert.equal(hasErrors(w), true);
});

test("semua hari tutup terdeteksi (peringatan, bukan galat)", () => {
  const w = standardWeek().map((x) => ({ ...x, open: false }));
  assert.equal(allClosed(w), true); assert.equal(hasErrors(w), false);
  assert.equal(allClosed(standardWeek()), false);
});

test("terapkan jam Senin ke semua hari (termasuk status tutup)", () => {
  const w = standardWeek(); w[0] = d(8, 22); w[3] = d(10, 12);
  assert.ok(applyMondayToAll(w).every((x) => x.open && x.buka === 8 && x.tutup === 22));
  const closedMon = standardWeek(); closedMon[0] = d(6, 24, false);
  assert.ok(applyMondayToAll(closedMon).every((x) => !x.open));
  assert.equal(w[3].buka, 10, "tidak mengubah array asal");
});

test("ringkasan: hari berurutan dengan jam sama digabung", () => {
  assert.equal(summarize(standardWeek()), "Setiap hari 06.00–24.00");
  const w = standardWeek(); w[5] = d(8, 22); w[6] = d(6, 24, false);
  assert.equal(summarize(w), "Senin–Jumat 06.00–24.00 · Sabtu 08.00–22.00 · Minggu tutup");
  const mid = standardWeek(); mid[2] = d(9, 21);
  assert.equal(summarize(mid), "Senin–Selasa 06.00–24.00 · Rabu 09.00–21.00 · Kamis–Minggu 06.00–24.00");
  assert.equal(summarize(standardWeek().map((x) => ({ ...x, open: false }))), "Tutup setiap hari");
  assert.equal(summarize(standardWeek().map((x) => d(6, 22))), "Setiap hari 06.00–22.00");
});

test("perubahan per hari dijelaskan; hari tutup dengan jam berbeda dianggap sama", () => {
  const a = standardWeek(); const b = cloneWeek(a);
  b[5] = d(8, 22); b[6] = d(6, 24, false);
  assert.deepEqual(describeChanges(a, b), ["Sabtu: 06.00–24.00 → 08.00–22.00", "Minggu: 06.00–24.00 → tutup"]);
  assert.deepEqual(describeChanges(b, a), ["Sabtu: 08.00–22.00 → 06.00–24.00", "Minggu: tutup → 06.00–24.00"]);
  assert.equal(sameWeek(a, cloneWeek(a)), true);
  const c1 = cloneWeek(a); c1[0] = d(6, 24, false); const c2 = cloneWeek(a); c2[0] = d(10, 12, false);
  assert.equal(sameWeek(c1, c2), true);
  assert.deepEqual(describeChanges(a, a), []);
});

test("menyempit vs memperluas: pesanan yang ada tidak dibatalkan, tapi admin diperingatkan", () => {
  const a = standardWeek();
  const narrow = cloneWeek(a); narrow[1] = d(8, 24);
  const closeDay = cloneWeek(a); closeDay[6] = d(6, 24, false);
  const earlierClose = cloneWeek(a); earlierClose[3] = d(6, 23);
  assert.equal(isNarrowing(a, narrow), true); assert.equal(isNarrowing(a, closeDay), true); assert.equal(isNarrowing(a, earlierClose), true);
  const base = cloneWeek(a); base[1] = d(8, 20);
  assert.equal(isNarrowing(base, a), false, "memperluas bukan menyempit");
  const openClosedDay = cloneWeek(a); openClosedDay[6] = d(6, 24, false);
  assert.equal(isNarrowing(openClosedDay, a), false, "membuka hari tutup bukan menyempit");
});

test("bilah rentang pada skala 06–24", () => {
  assert.deepEqual(barPercent(d(6, 24)), { left: 0, width: 100 });
  assert.deepEqual(barPercent(d(15, 24)), { left: 50, width: 50 });
  assert.equal(barPercent(d(6, 12, false)), null); assert.equal(barPercent(d(12, 12)), null);
});

test("menyimpan satu lapangan tidak mengubah lapangan lain", () => {
  const { courts } = buildHoursData(Date.UTC(2026, 10, 12, 5, 43));
  const all = Object.fromEntries(courts.map((c) => [c.id, c.hours]));
  const before = JSON.stringify(all);
  const week = cloneWeek(all["futsal-arena-a"]); week[6] = d(6, 24, false); week[5] = d(8, 22);
  const next = saveWeek(all, "futsal-arena-a", week);
  assert.equal(JSON.stringify(all), before, "data asal tidak berubah");
  for (const c of courts) if (c.id !== "futsal-arena-a") assert.equal(next[c.id], all[c.id], `${c.id} tidak tersentuh`);
  assert.equal(summarize(next["futsal-arena-a"]), "Senin–Jumat 06.00–24.00 · Sabtu 08.00–22.00 · Minggu tutup");
  assert.notEqual(next["futsal-arena-a"], week, "disimpan sebagai salinan");
});

test("data contoh konsisten dengan data publik; setiap lapangan valid; jumlah pesanan aktif", () => {
  const { courts, activeOrders } = buildHoursData(Date.UTC(2026, 10, 12, 5, 43));
  assert.equal(courts.length, 6);
  assert.ok(courts.every((c) => c.hours.length === 7 && !hasErrors(c.hours)));
  assert.equal(summarize(courts.find((c) => c.id === "futsal-arena-a")!.hours), "Setiap hari 06.00–24.00");
  assert.equal(summarize(courts.find((c) => c.id === "basket-outdoor")!.hours), "Setiap hari 06.00–22.00");
  assert.ok(Object.values(activeOrders).reduce((a, b) => a + b, 0) >= 3);
});

test("jam operasional memengaruhi kalender dan cakupan tarif (integrasi dengan halaman lain)", () => {
  const court = getCourtDetail("futsal-arena-a")!;
  const week = standardWeek(); week[3] = d(8, 22); // Kamis 08–22
  const now = Date.UTC(2026, 10, 11, 0, 0); // Rabu 11 Nov 2026
  const slots = computeSlots({ ...court, hours: week }, "2026-11-12", now, { occupancy: {}, blackouts: [] }); // Kamis
  assert.ok(slots.filter((s) => s.hour < 8 || s.hour >= 22).every((s) => s.status === "tidak-tersedia"));
  assert.ok(slots.filter((s) => s.hour >= 8 && s.hour < 22).every((s) => s.status === "tersedia"));
  // menutup Sabtu & Minggu → tarif weekend tidak lagi wajib menutupi jam apa pun
  const closedWeekend = standardWeek(); closedWeekend[5] = d(6, 24, false); closedWeekend[6] = d(6, 24, false);
  const t = courtTariffsFrom(court.tariffs); t.weekend = [];
  assert.equal(analyzeCourt(t, closedWeekend).weekend.gaps.length, 0);
  assert.equal(analyzeCourt(t, standardWeek()).weekend.gaps.length, 1);
});
