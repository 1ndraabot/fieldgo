import test from "node:test";
import assert from "node:assert/strict";
import { MESSAGES as M, addName, addPhotos, countFacility, countSport, movePhoto, normalizeCourt, parseCoordinate, removePhoto, uniqueId, validateCourt, type AdminCourt, type CourtPhoto } from "../lib/admin-courts.ts";
import { IMAGE_MESSAGES, sniffImage, validateImageFile } from "../lib/image-file.ts";
import { buildAdminCourtsData } from "../lib/mock-admin-courts.ts";

const ph = (id: string): CourtPhoto => ({ id, name: id, url: null, tone: 0 });
const court = (over: Partial<AdminCourt> = {}): AdminCourt => ({
  id: "x", nama: "Lapangan X", sport: "Futsal", aktif: true, desc: "Deskripsi", alamat: "Jl. A", lat: "-6.2088", lng: "106.8456",
  fotos: [ph("a")], utamaId: "a", fac: [], ...over,
});
const SPORTS = ["Futsal", "Badminton"];

test("koordinat: format angka & rentang, koma desimal diterima", () => {
  assert.deepEqual(parseCoordinate("-6.2088", "lat"), { ok: true, value: -6.2088 });
  assert.deepEqual(parseCoordinate(" 106,8456 ", "lng"), { ok: true, value: 106.8456 });
  assert.deepEqual(parseCoordinate("90", "lat"), { ok: true, value: 90 });
  assert.deepEqual(parseCoordinate("-180", "lng"), { ok: true, value: -180 });
  assert.deepEqual(parseCoordinate("", "lat"), { ok: false, message: M.latEmpty });
  assert.deepEqual(parseCoordinate("", "lng"), { ok: false, message: M.lngEmpty });
  for (const bad of ["abc", "91", "-90.1", "1e3", "6.2.1", "--5", "6,2,1", "12°"]) assert.deepEqual(parseCoordinate(bad, "lat"), { ok: false, message: M.lat }, bad);
  assert.deepEqual(parseCoordinate("181", "lng"), { ok: false, message: M.lng });
});

test("validasi lapangan: semua field wajib", () => {
  assert.deepEqual(validateCourt(court(), SPORTS), {});
  const empty = validateCourt(court({ nama: "  ", sport: "", desc: "", alamat: " ", lat: "", lng: "x", fotos: [], utamaId: null }), SPORTS);
  assert.deepEqual(Object.keys(empty).sort(), ["alamat", "desc", "foto", "lat", "lng", "nama", "sport"]);
  assert.equal(empty.foto, M.foto);
  assert.equal(validateCourt(court({ sport: "Voli" }), SPORTS).sport, M.sport, "jenis olahraga harus dari daftar");
});

test("normalisasi: trim, koordinat bertitik, foto utama valid", () => {
  const n = normalizeCourt(court({ nama: "  Arena  ", lat: "-6,2088", lng: " 106.8456", utamaId: "tidak-ada", fotos: [ph("a"), ph("b")] }));
  assert.deepEqual([n.nama, n.lat, n.lng, n.utamaId], ["Arena", "-6.2088", "106.8456", "a"]);
});

test("urutan foto: geser kiri/kanan, batas tepi, foto utama tetap menempel pada fotonya", () => {
  const f = [ph("a"), ph("b"), ph("c")];
  assert.deepEqual(movePhoto(f, 1, -1).map((x) => x.id), ["b", "a", "c"]);
  assert.deepEqual(movePhoto(f, 1, 1).map((x) => x.id), ["a", "c", "b"]);
  assert.equal(movePhoto(f, 0, -1), f); assert.equal(movePhoto(f, 2, 1), f);
});

test("hapus foto: foto utama dihapus → foto pertama jadi utama; hapus foto terakhir → tanpa utama", () => {
  let r = removePhoto([ph("a"), ph("b"), ph("c")], "b", "b");
  assert.deepEqual([r.fotos.map((x) => x.id), r.utamaId], [["a", "c"], "a"]);
  r = removePhoto([ph("a"), ph("b")], "b", "a");
  assert.deepEqual([r.fotos.map((x) => x.id), r.utamaId], [["b"], "b"]);
  r = removePhoto([ph("a")], "a", "a");
  assert.deepEqual([r.fotos, r.utamaId], [[], null]);
});

test("tambah foto: foto pertama otomatis utama; utama yang ada dipertahankan", () => {
  assert.equal(addPhotos([], null, [ph("a"), ph("b")]).utamaId, "a");
  assert.equal(addPhotos([ph("a"), ph("b")], "b", [ph("c")]).utamaId, "b");
});

test("jenis olahraga & fasilitas baru: wajib, tidak boleh kembar, dirapikan", () => {
  assert.deepEqual(addName(SPORTS, "  ", "sport"), { ok: false, message: "Nama jenis olahraga wajib diisi." });
  assert.deepEqual(addName(SPORTS, "FUTSAL", "sport"), { ok: false, message: "Jenis olahraga ini sudah ada." });
  assert.deepEqual(addName(["Loker"], "loker", "facility"), { ok: false, message: "Fasilitas ini sudah ada." });
  assert.deepEqual(addName(SPORTS, "  Bola   voli ", "sport"), { ok: true, list: [...SPORTS, "Bola voli"], name: "Bola voli" });
});

test("id unik dari nama", () => {
  assert.equal(uniqueId("Futsal Arena B", []), "futsal-arena-b");
  assert.equal(uniqueId("Futsal Arena A", ["futsal-arena-a"]), "futsal-arena-a-2");
  assert.equal(uniqueId("!!!", []), "lapangan");
});

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0, 0, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0];
const f = (b: number[], n: string, t: string) => new File([new Uint8Array(b)], n, { type: t });

test("foto harus berkas gambar sungguhan (tanpa batas ukuran)", async () => {
  for (const [b, n, t] of [[JPEG, "a.jpg", "image/jpeg"], [PNG, "a.PNG", "image/png"], [GIF, "a.gif", "image/gif"], [WEBP, "a.webp", "image/webp"], [JPEG, "a.jpeg", ""]] as const)
    assert.deepEqual(await validateImageFile(f([...b], n, t)), { ok: true }, n);
  assert.deepEqual(await validateImageFile(f(PDF, "doc.pdf", "application/pdf")), { ok: false, message: IMAGE_MESSAGES.notImage("doc.pdf") });
  assert.deepEqual(await validateImageFile(f(PNG, "x.svg", "image/svg+xml")), { ok: false, message: IMAGE_MESSAGES.notImage("x.svg") });
  assert.deepEqual(await validateImageFile(f(PDF, "palsu.png", "image/png")), { ok: false, message: IMAGE_MESSAGES.mismatch("palsu.png") });
  assert.deepEqual(await validateImageFile(new File([], "kosong.png", { type: "image/png" })), { ok: false, message: IMAGE_MESSAGES.empty("kosong.png") });
  // berkas besar tetap diterima: tidak ada batas ukuran
  assert.deepEqual(await validateImageFile(new File([new Uint8Array(JPEG), new Uint8Array(12 * 1024 * 1024)], "besar.jpg", { type: "image/jpeg" })), { ok: true });
  assert.equal(sniffImage(new Uint8Array(JPEG)), "jpeg");
});

test("data contoh konsisten dengan data publik", () => {
  const d = buildAdminCourtsData();
  assert.equal(d.courts.length, 6);
  assert.ok(d.courts.every((c) => !Object.keys(validateCourt(c, d.sports)).length), "semua lapangan contoh valid");
  assert.ok(d.courts.every((c) => c.fac.every((x) => d.facilities.includes(x))));
  assert.ok(d.courts.every((c) => c.utamaId === c.fotos[0].id));
  assert.equal(countSport(d.courts, "Badminton"), 2);
  assert.equal(countFacility(d.courts, "Musala") > 0, true);
  assert.deepEqual(d.sports, ["Futsal", "Badminton", "Basket", "Tenis", "Mini soccer"]);
});
