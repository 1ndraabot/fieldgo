import test from "node:test";
import assert from "node:assert/strict";
import { PAGE_SIZE, STATUSES, STATUS_LABEL, durationLabel, filterOrders, isFiltering, matchesQuery, newestFirst, paginate, rangeText, scheduleLabel, dateShort, type AdminOrder, type OrderStatus } from "../lib/admin-orders.ts";
import { buildOrdersData } from "../lib/mock-orders.ts";
import { buildVerificationData } from "../lib/mock-verification.ts";
import { tariffFor } from "../lib/availability.ts";
import { getCourtDetail } from "../lib/court-detail.ts";

const NOW = Date.UTC(2026, 10, 12, 5, 43);
const orders = buildOrdersData(NOW);
const codes = (xs: AdminOrder[]) => xs.map((o) => o.kode);

test("data contoh: 17 pesanan, kode unik, kedelapan status ada, terbaru dulu", () => {
  assert.equal(orders.length, 17);
  assert.equal(new Set(codes(orders)).size, 17);
  for (const s of STATUSES) assert.ok(orders.some((o) => o.status === s.value), s.value);
  assert.deepEqual(codes(newestFirst(orders)), codes(orders));
  assert.ok(orders.every((o) => /^GH-[2-9A-HJKMNP-Z]{6}$/.test(o.kode)));
});

test("total pesanan = jumlah tarif per jam pada tanggal itu; durasi dan jadwal terformat", () => {
  for (const o of orders) {
    const court = getCourtDetail(o.courtId)!;
    let sum = 0; for (let h = o.startHour; h < o.startHour + o.hours; h++) sum += tariffFor(court, o.date, h) ?? 0;
    if (o.status === "menunggu_verifikasi" || o.status === "pengajuan_pembatalan") continue; // total dari data verifikasi (juga dihitung dari tarif)
    assert.equal(o.total, sum, o.kode);
  }
  const o = orders[0];
  assert.equal(durationLabel(2), "2 jam");
  assert.equal(dateShort("2026-11-07"), "7 Nov 2026");
  assert.equal(scheduleLabel({ date: "2026-11-07", startHour: 20, hours: 2 }), "7 Nov 2026, 20.00 sampai 22.00");
  assert.match(scheduleLabel(o), /^\d{1,2} \w{3} 2026, \d\d\.00 sampai \d\d\.00$/);
});

test("konsisten dengan Admin Verifikasi: kode, penyewa, dan total yang sama", () => {
  const v = buildVerificationData(NOW);
  for (const p of v.payments) {
    const o = orders.find((x) => x.kode === p.kode)!;
    assert.deepEqual([o.status, o.penyewa, o.total, o.date], ["menunggu_verifikasi", p.penyewa, p.total, p.date]);
  }
  for (const c of v.cancellations) {
    const o = orders.find((x) => x.kode === c.kode)!;
    assert.deepEqual([o.status, o.penyewa, o.total], ["pengajuan_pembatalan", c.pemesan, c.total]);
  }
});

test("cari kode: lengkap, sebagian, tanpa tanda hubung, tak peka huruf besar", () => {
  assert.deepEqual(codes(filterOrders(orders, "GH-7K4M2Q", "semua")), ["GH-7K4M2Q"]);
  assert.deepEqual(codes(filterOrders(orders, "gh-7k4", "semua")), ["GH-7K4M2Q"]);
  assert.deepEqual(codes(filterOrders(orders, "gh7k4m", "semua")), ["GH-7K4M2Q"]);
  assert.deepEqual(codes(filterOrders(orders, "  7k4m2q  ", "semua")), ["GH-7K4M2Q"]);
  assert.equal(filterOrders(orders, "GH-", "semua").length, 17, "awalan GH- cocok semua");
  assert.equal(filterOrders(orders, "GH-ZZZZZZ", "semua").length, 0);
});

test("cari nama penyewa: sebagian, tak peka huruf besar, spasi ganda, aksen", () => {
  assert.deepEqual(codes(filterOrders(orders, "rani", "semua")).sort(), ["GH-7K4M2Q", "GH-F7W3JS", "GH-X5M8EP"].sort());
  assert.equal(filterOrders(orders, "RANI PUTRI", "semua").length, 3);
  assert.equal(filterOrders(orders, "rani   putri", "semua").length, 3);
  assert.equal(filterOrders(orders, "rina", "semua").every((o) => /rina/i.test(o.penyewa)), true);
  assert.equal(filterOrders(orders, "zzz", "semua").length, 0);
  const accented: AdminOrder = { ...orders[0], penyewa: "Siti Nurhalizá" };
  assert.equal(matchesQuery(accented, "nurhaliza"), true);
});

test("kata kunci kosong/spasi tidak menyaring", () => {
  assert.equal(filterOrders(orders, "", "semua").length, 17);
  assert.equal(filterOrders(orders, "   ", "semua").length, 17);
});

test("setiap pilihan filter status: hanya status itu; jumlah semua status = total", () => {
  let sum = 0;
  for (const s of STATUSES) {
    const r = filterOrders(orders, "", s.value);
    assert.ok(r.length > 0 && r.every((o) => o.status === s.value), s.value);
    sum += r.length;
  }
  assert.equal(sum, orders.length);
  assert.equal(filterOrders(orders, "", "semua").length, orders.length);
  assert.deepEqual(STATUSES.map((s) => s.label), [
    "Menunggu pembayaran", "Menunggu verifikasi", "Terkonfirmasi", "Pengajuan pembatalan", "Ditolak", "Kedaluwarsa", "Dibatalkan", "Selesai",
  ]);
  assert.equal(STATUS_LABEL.selesai, "Selesai");
});

test("kombinasi pencarian + filter status", () => {
  assert.deepEqual(codes(filterOrders(orders, "rani", "selesai")), ["GH-F7W3JS"]);
  assert.deepEqual(codes(filterOrders(orders, "rani", "terkonfirmasi")), ["GH-X5M8EP"]);
  assert.deepEqual(codes(filterOrders(orders, "rani", "menunggu_verifikasi")), ["GH-7K4M2Q"]);
  assert.equal(filterOrders(orders, "rani", "ditolak").length, 0, "kombinasi tanpa hasil → empty state");
  assert.equal(filterOrders(orders, "GH-7K4M2Q", "selesai").length, 0);
});

test("reset: kata kunci kosong + 'semua' mengembalikan seluruh daftar", () => {
  assert.equal(isFiltering("", "semua"), false); assert.equal(isFiltering(" ", "semua"), false);
  assert.equal(isFiltering("a", "semua"), true); assert.equal(isFiltering("", "selesai"), true);
  assert.equal(filterOrders(orders, "", "semua").length, orders.length);
});

test("pagination: 6 per halaman, 17 pesanan → 3 halaman, teks rentang, penjepitan halaman", () => {
  assert.equal(PAGE_SIZE, 6);
  const p1 = paginate(orders, 1);
  assert.deepEqual([p1.items.length, p1.pages, p1.page, p1.from, p1.to, p1.total], [6, 3, 1, 1, 6, 17]);
  assert.equal(rangeText(p1.from, p1.to, p1.total), "Menampilkan 1 sampai 6 dari 17 pesanan");
  const p3 = paginate(orders, 3);
  assert.deepEqual([p3.items.length, p3.from, p3.to], [5, 13, 17]);
  assert.equal(paginate(orders, 99).page, 3, "halaman terlalu besar dijepit");
  assert.equal(paginate(orders, 0).page, 1);
  const none = paginate([], 1);
  assert.deepEqual([none.pages, none.page, none.from, none.to], [1, 1, 0, 0]);
  assert.equal(rangeText(none.from, none.to, none.total), "");
  // semua halaman bersama = seluruh data tanpa duplikat
  const all = [1, 2, 3].flatMap((n) => codes(paginate(orders, n).items));
  assert.deepEqual(all, codes(orders));
});

test("pagination mengikuti hasil filter (halaman jepit saat hasil menyusut)", () => {
  const r = filterOrders(orders, "", "selesai");
  assert.equal(paginate(r, 3).page, 1, "3 hasil → satu halaman");
  assert.equal(paginate(r, 1).total, 3);
});
