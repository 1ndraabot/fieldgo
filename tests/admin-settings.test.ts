import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CANCEL_DAYS, DEFAULT_PAYMENT_HOURS, MAX_CANCEL_DAYS, MAX_PAYMENT_HOURS, MESSAGES as M, accountChanged, cancelText, describeChanges, groupAccount,
  hoursText, normalizeSettings, sameSettings, validateSettings, type SettingsForm,
} from "../lib/admin-settings.ts";
import { buildSettings } from "../lib/mock-settings.ts";
import { MOCK_BANK } from "../lib/mock-order.ts";
import { paymentDeadlineMs } from "../lib/payment-deadline.ts";

const ok = (): SettingsForm => ({ bank: "Bank BCA", rek: "1234567890", an: "Gelanggang Sport", bayar: "24", batal: "1" });
const err = (p: Partial<SettingsForm>) => validateSettings({ ...ok(), ...p });

test("nilai awal sesuai PRD: 24 jam dan 1 hari; data contoh valid dan sama dengan halaman Pembayaran", () => {
  assert.equal(DEFAULT_PAYMENT_HOURS, 24); assert.equal(DEFAULT_CANCEL_DAYS, 1);
  const s = buildSettings();
  assert.deepEqual(validateSettings(s), {});
  assert.deepEqual([s.bayar, s.batal], ["24", "1"]);
  assert.deepEqual([s.bank, s.rek, s.an], [MOCK_BANK.name, MOCK_BANK.accountNumber, MOCK_BANK.accountName]);
});

test("nama bank dan atas nama wajib (spasi saja dianggap kosong)", () => {
  assert.equal(err({ bank: "" }).bank, M.bank); assert.equal(err({ bank: "   " }).bank, M.bank);
  assert.equal(err({ an: "" }).an, M.an); assert.equal(err({ an: "  " }).an, M.an);
  assert.deepEqual(err({}), {});
});

test("nomor rekening: wajib, hanya angka, 6 sampai 20 digit", () => {
  assert.equal(err({ rek: "" }).rek, M.rekEmpty); assert.equal(err({ rek: "   " }).rek, M.rekEmpty);
  for (const bad of ["12ab56", "1234 5678", "123-456-789", "12.345.678", "+62812345", "abcdefgh", "１２３４５６７"]) assert.equal(err({ rek: bad }).rek, M.rekDigits, bad);
  for (const short of ["1", "12345"]) assert.equal(err({ rek: short }).rek, M.rekLength, short);
  assert.equal(err({ rek: "1".repeat(21) }).rek, M.rekLength);
  assert.equal(err({ rek: "123456" }).rek, undefined); assert.equal(err({ rek: "1".repeat(20) }).rek, undefined);
});

test("batas pembayaran: bilangan bulat positif, maksimal 72 jam", () => {
  assert.equal(err({ bayar: "" }).bayar, M.bayarEmpty); assert.equal(err({ bayar: "  " }).bayar, M.bayarEmpty);
  for (const bad of ["abc", "2.5", "1e2", "12 jam", "--3"]) assert.equal(err({ bayar: bad }).bayar, M.bayarInt, bad);
  for (const bad of ["0", "-1", "-24"]) assert.equal(err({ bayar: bad }).bayar, M.bayarPositive, bad);
  assert.equal(err({ bayar: String(MAX_PAYMENT_HOURS + 1) }).bayar, M.bayarMax);
  for (const good of ["1", "24", "48", "72", " 36 "]) assert.equal(err({ bayar: good }).bayar, undefined, good);
});

test("batas pembatalan: bilangan bulat positif (0 ditolak), maksimal 14 hari", () => {
  assert.equal(err({ batal: "" }).batal, M.batalEmpty);
  for (const bad of ["abc", "1.5", "satu"]) assert.equal(err({ batal: bad }).batal, M.batalInt, bad);
  for (const bad of ["0", "-1"]) assert.equal(err({ batal: bad }).batal, M.batalPositive, bad);
  assert.equal(err({ batal: String(MAX_CANCEL_DAYS + 1) }).batal, M.batalMax);
  for (const good of ["1", "2", "7", "14"]) assert.equal(err({ batal: good }).batal, undefined, good);
});

test("semua galat dilaporkan sekaligus; tidak ada galat → boleh disimpan", () => {
  const e = validateSettings({ bank: "", rek: "abc", an: "", bayar: "0", batal: "" });
  assert.deepEqual(Object.keys(e).sort(), ["an", "bank", "batal", "bayar", "rek"]);
  assert.equal(Object.keys(validateSettings(ok())).length, 0);
});

test("normalisasi: trim, spasi ganda, angka tanpa nol di depan", () => {
  assert.deepEqual(normalizeSettings({ bank: "  Bank   Mandiri ", rek: " 1230009876 ", an: "PT  Gelanggang   Olahraga", bayar: " 048 ", batal: "02" }),
    { bank: "Bank Mandiri", rek: "1230009876", an: "PT Gelanggang Olahraga", bayar: "48", batal: "2" });
});

test("deteksi perubahan (abaikan spasi tepi) dan deskripsi perubahan untuk konfirmasi", () => {
  const a = ok();
  assert.equal(sameSettings(a, { ...a }), true);
  assert.equal(sameSettings(a, { ...a, bank: "  Bank BCA " }), true);
  assert.equal(sameSettings(a, { ...a, bayar: "48" }), false);
  assert.deepEqual(describeChanges(a, a), []);
  assert.deepEqual(describeChanges(a, { ...a, bank: "Bank Mandiri", rek: "1230009876", bayar: "48", batal: "2" }), [
    "Nama bank: Bank BCA → Bank Mandiri", "Nomor rekening: 1234 567 890 → 1230 009 876", "Batas pembayaran: 24 jam → 48 jam", "Batas pembatalan: H-1 → H-2",
  ]);
});

test("perubahan rekening dikenali (butuh peringatan), perubahan batas waktu saja tidak", () => {
  const a = ok();
  assert.equal(accountChanged(a, { ...a, rek: "9999999999" }), true);
  assert.equal(accountChanged(a, { ...a, an: "Lain" }), true);
  assert.equal(accountChanged(a, { ...a, bayar: "48", batal: "3" }), false);
});

test("format tampilan", () => {
  assert.equal(hoursText(24), "24 jam"); assert.equal(cancelText("1"), "H-1");
  assert.equal(groupAccount("1234567890"), "1234 567 890"); assert.equal(groupAccount("12345"), "12345");
});

test("batas bayar baru memengaruhi hitungan tenggat (PRD 5.3): min(dibuat + N jam, jam mulai)", () => {
  const created = Date.UTC(2026, 10, 11, 13, 0); // 20.00 WIB
  assert.equal(paymentDeadlineMs(created, "2026-11-20", 8, 24), created + 24 * 3600_000);
  assert.equal(paymentDeadlineMs(created, "2026-11-20", 8, 48), created + 48 * 3600_000);
  assert.equal(paymentDeadlineMs(created, "2026-11-12", 8, 48), Date.UTC(2026, 10, 12, 1, 0), "tetap dibatasi jam mulai main");
});
