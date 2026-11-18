import { computeSlots, type DayAvailability, type SlotInfo } from "../availability";
import { getCourtDetail, type CourtDetail, type DayHours, type Tariff } from "../court-detail";
import { addDays } from "../datetime";
import type { Blackout, Occupancy } from "../mock-availability";
import type { CourtOption } from "../booking-types";
import { getDb, type Db } from "./db";

export function getSetting(name: string, fallback: number, db: Db = getDb()): number {
  const v = Number(db.prepare("SELECT nilai FROM pengaturan WHERE nama = ?").get(name)?.nilai);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function listActiveCourts(db: Db = getDb()): CourtOption[] {
  return db.prepare("SELECT id, nama, jenis_olahraga FROM lapangan WHERE aktif = 1 ORDER BY rowid").all()
    .map((r) => ({ id: String(r.id), name: String(r.nama), sport: String(r.jenis_olahraga) }));
}

/** Lapangan lengkap: tarif, jam operasional, dan status aktif dari basis data (sumber kebenaran harga). */
export function loadCourtDetail(courtId: string, db: Db = getDb()): CourtDetail | null {
  const base = getCourtDetail(courtId); // hanya untuk data tampilan (foto, fasilitas, deskripsi)
  const row = db.prepare("SELECT id, nama, jenis_olahraga, aktif FROM lapangan WHERE id = ?").get(courtId);
  if (!base || !row) return null;

  const tariffs: Tariff[] = db
    .prepare("SELECT tipe_hari, jam_mulai, jam_selesai, harga_per_jam FROM tarif WHERE lapangan_id = ? ORDER BY tipe_hari, jam_mulai")
    .all(courtId)
    .map((t) => ({ tipe: t.tipe_hari as Tariff["tipe"], mulai: Number(t.jam_mulai), selesai: Number(t.jam_selesai), harga: Number(t.harga_per_jam) }));

  const hours: DayHours[] = Array.from({ length: 7 }, () => ({ buka: 6, tutup: 24, open: false }));
  for (const h of db.prepare("SELECT hari, jam_buka, jam_tutup, buka FROM jam_operasional WHERE lapangan_id = ?").all(courtId)) {
    hours[Number(h.hari)] = { buka: Number(h.jam_buka), tutup: Number(h.jam_tutup), open: Number(h.buka) === 1 };
  }

  return { ...base, name: String(row.nama), sport: String(row.jenis_olahraga), active: Number(row.aktif) === 1, tariffs, hours };
}

function loadBlackouts(courtId: string, db: Db): Blackout[] {
  return db.prepare("SELECT tanggal_mulai, tanggal_selesai, jam_mulai, jam_selesai FROM blokir_jadwal WHERE lapangan_id = ?").all(courtId)
    .map((b) => ({
      from: String(b.tanggal_mulai), to: String(b.tanggal_selesai),
      ...(b.jam_mulai !== null && b.jam_selesai !== null ? { fromHour: Number(b.jam_mulai), toHour: Number(b.jam_selesai) } : {}),
    }));
}

/**
 * Status slot dari pesanan aktif — TANPA data pemilik pesanan (PRD Bagian 6).
 * Menunggu pembayaran yang sudah lewat batas dianggap lepas (pengaman penjadwal, PRD Bagian 8).
 */
export function loadOccupancy(courtId: string, fromISO: string, toISO: string, nowMs: number, db: Db = getDb()) {
  const out: Record<string, Record<number, Occupancy>> = {};
  const rows = db.prepare(
    `SELECT s.tanggal, s.jam, p.status, p.batas_bayar_pada FROM slot_pesanan s
     JOIN pesanan p ON p.id = s.pesanan_id
     WHERE s.lapangan_id = ? AND s.aktif = 1 AND s.tanggal BETWEEN ? AND ?`,
  ).all(courtId, fromISO, toISO);
  for (const r of rows) {
    const status = String(r.status);
    let occ: Occupancy | null = null;
    if (status === "terkonfirmasi" || status === "pengajuan_pembatalan" || status === "selesai") occ = "terisi";
    else if (status === "menunggu_verifikasi") occ = "ditahan";
    else if (status === "menunggu_pembayaran" && Number(r.batas_bayar_pada) > nowMs) occ = "ditahan";
    if (occ) (out[String(r.tanggal)] ??= {})[Number(r.jam)] = occ;
  }
  return out;
}

export function loadAvailabilityRange(courtId: string, fromISO: string, days: number, nowMs: number, db: Db = getDb()) {
  return {
    occupancy: loadOccupancy(courtId, fromISO, addDays(fromISO, days - 1), nowMs, db),
    blackouts: loadBlackouts(courtId, db),
  };
}

export function loadDayAvailability(courtId: string, dateISO: string, nowMs: number, db: Db = getDb()): DayAvailability {
  return {
    occupancy: loadOccupancy(courtId, dateISO, dateISO, nowMs, db)[dateISO] ?? {},
    blackouts: loadBlackouts(courtId, db),
  };
}

/** 18 slot satu tanggal dihitung dari data basis data. null bila lapangan tidak ada. */
export function getDaySlots(courtId: string, dateISO: string, nowMs: number, db: Db = getDb()): SlotInfo[] | null {
  const court = loadCourtDetail(courtId, db);
  return court ? computeSlots(court, dateISO, nowMs, loadDayAvailability(courtId, dateISO, nowMs, db)) : null;
}

/** Lepaskan pesanan menunggu pembayaran yang lewat batas (BR-09). Panggil di dalam transaksi. */
export function expireOverdue(nowMs: number, db: Db = getDb()) {
  const overdue = db.prepare("SELECT id FROM pesanan WHERE status = 'menunggu_pembayaran' AND batas_bayar_pada <= ?").all(nowMs);
  for (const o of overdue) {
    const id = Number(o.id);
    db.prepare("UPDATE pesanan SET status = 'kedaluwarsa' WHERE id = ?").run(id);
    db.prepare("UPDATE slot_pesanan SET aktif = 0 WHERE pesanan_id = ?").run(id);
    db.prepare("INSERT INTO riwayat_status (pesanan_id, status_lama, status_baru, diubah_oleh, waktu, catatan) VALUES (?, 'menunggu_pembayaran', 'kedaluwarsa', NULL, ?, 'Lewat batas bayar')").run(id, nowMs);
  }
}
