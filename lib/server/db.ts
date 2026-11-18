import fs from "node:fs";
import path from "node:path";
import { COURTS } from "../data";
import { getCourtDetail } from "../court-detail";
import { addDays, wibNow } from "../datetime";
import { getBlackouts, getOccupancy } from "../mock-availability";

/**
 * SQLite via modul bawaan Node (`node:sqlite`, Node >= 22.13) — tanpa dependensi native.
 * Antarmuka kecil ini kompatibel dengan better-sqlite3 bila ingin diganti.
 * Skema mengikuti PRD Bagian 7 (subset yang dibutuhkan alur pemesanan).
 */
export type SqlParam = string | number | null;
type Row = Record<string, unknown>;
export interface Stmt {
  get(...p: SqlParam[]): Row | undefined;
  all(...p: SqlParam[]): Row[];
  run(...p: SqlParam[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}
export interface Db {
  exec(sql: string): void;
  prepare(sql: string): Stmt;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS lapangan (
  id TEXT PRIMARY KEY, nama TEXT NOT NULL, jenis_olahraga TEXT NOT NULL, aktif INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS tarif (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lapangan_id TEXT NOT NULL REFERENCES lapangan(id),
  tipe_hari TEXT NOT NULL CHECK (tipe_hari IN ('weekday','weekend')),
  jam_mulai INTEGER NOT NULL CHECK (jam_mulai BETWEEN 6 AND 23),
  jam_selesai INTEGER NOT NULL CHECK (jam_selesai BETWEEN 7 AND 24),
  harga_per_jam INTEGER NOT NULL CHECK (harga_per_jam > 0),
  CHECK (jam_selesai > jam_mulai)
);
CREATE TABLE IF NOT EXISTS jam_operasional (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lapangan_id TEXT NOT NULL REFERENCES lapangan(id),
  hari INTEGER NOT NULL CHECK (hari BETWEEN 0 AND 6),
  jam_buka INTEGER NOT NULL, jam_tutup INTEGER NOT NULL, buka INTEGER NOT NULL DEFAULT 1,
  UNIQUE (lapangan_id, hari)
);
CREATE TABLE IF NOT EXISTS blokir_jadwal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lapangan_id TEXT NOT NULL REFERENCES lapangan(id),
  tanggal_mulai TEXT NOT NULL, tanggal_selesai TEXT NOT NULL,
  jam_mulai INTEGER, jam_selesai INTEGER, alasan TEXT
);
CREATE TABLE IF NOT EXISTS pengguna (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL, email TEXT NOT NULL UNIQUE, nomor_kontak TEXT,
  peran TEXT NOT NULL DEFAULT 'penyewa' CHECK (peran IN ('penyewa','admin')),
  email_terverifikasi_pada INTEGER, dinonaktifkan_pada INTEGER, dibuat_pada INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pesanan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode_pesanan TEXT NOT NULL UNIQUE,
  pengguna_id INTEGER NOT NULL REFERENCES pengguna(id),
  lapangan_id TEXT NOT NULL REFERENCES lapangan(id),
  tanggal_main TEXT NOT NULL, jam_mulai INTEGER NOT NULL, jam_selesai INTEGER NOT NULL,
  jumlah_jam INTEGER NOT NULL, total_harga INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('menunggu_pembayaran','menunggu_verifikasi','terkonfirmasi',
    'pengajuan_pembatalan','ditolak','kedaluwarsa','dibatalkan','selesai')),
  batas_bayar_pada INTEGER NOT NULL, alasan_penolakan TEXT, dibuat_pada INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS slot_pesanan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pesanan_id INTEGER NOT NULL REFERENCES pesanan(id),
  lapangan_id TEXT NOT NULL REFERENCES lapangan(id),
  tanggal TEXT NOT NULL, jam INTEGER NOT NULL CHECK (jam BETWEEN 6 AND 23),
  harga_per_jam INTEGER NOT NULL, aktif INTEGER NOT NULL DEFAULT 1
);
-- Kunci anti double booking (BR-01): satu slot hanya boleh dipegang satu baris aktif.
CREATE UNIQUE INDEX IF NOT EXISTS ux_slot_aktif ON slot_pesanan (lapangan_id, tanggal, jam) WHERE aktif = 1;
CREATE INDEX IF NOT EXISTS ix_slot_lookup ON slot_pesanan (lapangan_id, tanggal);
CREATE TABLE IF NOT EXISTS riwayat_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pesanan_id INTEGER NOT NULL REFERENCES pesanan(id),
  status_lama TEXT, status_baru TEXT NOT NULL, diubah_oleh INTEGER, waktu INTEGER NOT NULL, catatan TEXT
);
CREATE TABLE IF NOT EXISTS pengaturan (nama TEXT PRIMARY KEY, nilai TEXT NOT NULL);
`;

const SEED_DAYS = 60;

type SqliteModule = { DatabaseSync: new (file: string) => Db };

function open(): Db {
  const getBuiltin = (process as unknown as { getBuiltinModule?: (id: string) => unknown }).getBuiltinModule;
  const mod = getBuiltin?.("node:sqlite") as SqliteModule | undefined;
  if (!mod) throw new Error("Basis data membutuhkan Node.js >= 22.13 (modul bawaan node:sqlite).");

  const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "gelanggang.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new mod.DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

const g = globalThis as unknown as { __ghDb?: Db };
export function getDb(): Db {
  return (g.__ghDb ??= open());
}

/** Jalankan fn dalam transaksi atomik (BEGIN IMMEDIATE mengunci penulis lain sampai selesai). */
export function inTransaction<T>(db: Db, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* sudah di-rollback */ }
    throw e;
  }
}

/** Data awal: lapangan/tarif/jam dari data contoh, 3 akun demo, dan pesanan pemain lain agar kalender terisi. */
function seedIfEmpty(db: Db) {
  if (db.prepare("SELECT COUNT(*) AS n FROM lapangan").get()?.n !== 0) return;
  const nowMs = Date.now();
  const today = wibNow(nowMs).dateISO;

  inTransaction(db, () => {
    const insCourt = db.prepare("INSERT INTO lapangan (id, nama, jenis_olahraga, aktif) VALUES (?,?,?,1)");
    const insTarif = db.prepare("INSERT INTO tarif (lapangan_id, tipe_hari, jam_mulai, jam_selesai, harga_per_jam) VALUES (?,?,?,?,?)");
    const insJam = db.prepare("INSERT INTO jam_operasional (lapangan_id, hari, jam_buka, jam_tutup, buka) VALUES (?,?,?,?,?)");
    const insBlok = db.prepare("INSERT INTO blokir_jadwal (lapangan_id, tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai, alasan) VALUES (?,?,?,?,?,?)");

    for (const c of COURTS) {
      const d = getCourtDetail(c.id);
      if (!d) continue;
      insCourt.run(d.id, d.name, d.sport);
      d.tariffs.forEach((t) => insTarif.run(d.id, t.tipe, t.mulai, t.selesai, t.harga));
      d.hours.forEach((h, i) => insJam.run(d.id, i, h.buka, h.tutup, h.open ? 1 : 0));
      getBlackouts(d.id, today).forEach((b) => insBlok.run(d.id, b.from, b.to, b.fromHour ?? null, b.toHour ?? null, "Pemeliharaan"));
    }

    const insUser = db.prepare("INSERT INTO pengguna (nama, email, nomor_kontak, peran, email_terverifikasi_pada, dibuat_pada) VALUES (?,?,?,?,?,?)");
    insUser.run("Rani Putri", "rani@example.com", "081200000001", "penyewa", nowMs, nowMs); // id 1 — terverifikasi
    insUser.run("Budi Santoso", "budi@example.com", "081200000002", "penyewa", null, nowMs); // id 2 — belum verifikasi
    insUser.run("Penyewa Lain", "lain@example.com", "081200000003", "penyewa", nowMs, nowMs); // id 3 — pemilik pesanan demo

    db.prepare("INSERT INTO pengaturan (nama, nilai) VALUES ('batas_bayar_jam','24'), ('batas_pembatalan_hari','1')").run();

    // Pesanan demo (satu slot per pesanan) mengikuti pola data contoh lama.
    const insOrder = db.prepare(
      "INSERT INTO pesanan (kode_pesanan, pengguna_id, lapangan_id, tanggal_main, jam_mulai, jam_selesai, jumlah_jam, total_harga, status, batas_bayar_pada, dibuat_pada) VALUES (?,3,?,?,?,?,1,?,?,?,?)",
    );
    const insSlot = db.prepare("INSERT INTO slot_pesanan (pesanan_id, lapangan_id, tanggal, jam, harga_per_jam, aktif) VALUES (?,?,?,?,?,1)");
    let n = 0;
    for (const c of COURTS) {
      const d = getCourtDetail(c.id)!;
      for (let i = 0; i < SEED_DAYS; i++) {
        const date = addDays(today, i);
        for (const [hs, occ] of Object.entries(getOccupancy(c.id, date))) {
          const h = Number(hs);
          const price = d.tariffs.find((t) => h >= t.mulai && h < t.selesai)?.harga ?? d.tariffs[0].harga;
          const status = occ === "terisi" ? "terkonfirmasi" : "menunggu_verifikasi";
          const start = Date.parse(`${date}T${String(h).padStart(2, "0")}:00:00+07:00`);
          const r = insOrder.run(`DM-${String(++n).padStart(5, "0")}`, c.id, date, h, h + 1, price, status, start, nowMs);
          insSlot.run(Number(r.lastInsertRowid), c.id, date, h, price);
        }
      }
    }
  });
}
