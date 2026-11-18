import { randomInt } from "node:crypto";
import { computeSlots } from "../availability";
import { BookingError } from "../booking-errors";
import { addDays } from "../datetime";
import { paymentDeadlineMs } from "../payment-deadline";
import { buildBreakdown, isContiguous } from "../selection";
import { getDb, inTransaction, type Db } from "./db";
import { expireOverdue, getSetting, loadCourtDetail, loadDayAvailability } from "./repo";

export type CreateOrderInput = unknown; // payload dari klien: HANYA lapangan, tanggal, jam yang dipakai
export type CreatedOrder = {
  id: number; kode: string; lapanganId: string; tanggal: string; jam: number[];
  totalHarga: number; batasBayarPada: number;
};

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // tanpa 0/O/1/I/L agar mudah dibaca
const newCode = () => "GH-" + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

/** Validasi bentuk input; harga/total/status/pengguna dari klien diabaikan sepenuhnya. */
export function parseInput(raw: unknown): { courtId: string; date: string; hours: number[] } {
  const bad = () => new BookingError("INVALID_INPUT");
  if (typeof raw !== "object" || raw === null) throw bad();
  const o = raw as Record<string, unknown>;
  const courtId = o.lapangan, date = o.tanggal, jam = o.jam;
  if (typeof courtId !== "string" || courtId.length === 0 || courtId.length > 64) throw bad();
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || addDays(date, 0) !== date) throw bad();
  if (!Array.isArray(jam) || jam.length < 1 || jam.length > 18) throw bad();
  if (!jam.every((h) => Number.isInteger(h) && h >= 6 && h <= 23)) throw bad();
  const hours = [...(jam as number[])].sort((a, b) => a - b);
  if (new Set(hours).size !== hours.length) throw bad();
  return { courtId, date, hours };
}

const isUniqueViolation = (e: unknown) => e instanceof Error && /UNIQUE constraint failed/i.test(e.message);

/**
 * Buat pesanan secara atomik (PRD FR-ORD-03/04, BR-01…BR-07).
 * `userId` HARUS berasal dari sesi server, bukan dari body request.
 */
export function createBooking(raw: CreateOrderInput, userId: number | null, nowMs: number = Date.now(), db: Db = getDb()): CreatedOrder {
  if (userId === null) throw new BookingError("UNAUTHENTICATED");
  const { courtId, date, hours } = parseInput(raw);

  try {
    return inTransaction(db, () => {
      // 1. akun: ada, aktif, email terverifikasi (BR-02)
      const user = db.prepare("SELECT id, email_terverifikasi_pada, dinonaktifkan_pada FROM pengguna WHERE id = ?").get(userId);
      if (!user) throw new BookingError("UNAUTHENTICATED");
      if (user.dinonaktifkan_pada !== null) throw new BookingError("ACCOUNT_DISABLED");
      if (user.email_terverifikasi_pada === null) throw new BookingError("EMAIL_NOT_VERIFIED");

      // 2. lepaskan pesanan kedaluwarsa agar slotnya tidak menghalangi (BR-09)
      expireOverdue(nowMs, db);

      // 3. lapangan + keberurutan jam (BR-03)
      const court = loadCourtDetail(courtId, db);
      if (!court) throw new BookingError("COURT_NOT_FOUND");
      if (!court.active) throw new BookingError("COURT_INACTIVE");
      if (!isContiguous(hours)) throw new BookingError("NOT_CONTIGUOUS");

      // 4. periksa ulang ketersediaan dari basis data (urutan PRD Bagian 6)
      const slots = computeSlots(court, date, nowMs, loadDayAvailability(courtId, date, nowMs, db));
      const picked = hours.map((h) => slots.find((s) => s.hour === h)!);
      if (picked.some((s) => s.past)) throw new BookingError("SLOT_PAST");
      if (picked.some((s) => s.status === "tidak-tersedia")) throw new BookingError("SLOT_UNAVAILABLE");
      if (picked.some((s) => s.status !== "tersedia")) throw new BookingError("SLOT_TAKEN");

      // 5. harga dihitung ulang dari tarif basis data, per jam (BR-06, AC-05)
      const { total } = buildBreakdown(slots, hours);

      // 6. batas bayar (BR-07, PRD 5.3)
      const batasBayar = paymentDeadlineMs(nowMs, date, hours[0], getSetting("batas_bayar_jam", 24, db));

      // 7. kode unik yang mudah dibaca
      let kode = newCode();
      while (db.prepare("SELECT 1 AS x FROM pesanan WHERE kode_pesanan = ?").get(kode)) kode = newCode();

      // 8. simpan pesanan + slot (harga terkunci) + riwayat — satu transaksi
      const r = db.prepare(
        `INSERT INTO pesanan (kode_pesanan, pengguna_id, lapangan_id, tanggal_main, jam_mulai, jam_selesai,
           jumlah_jam, total_harga, status, batas_bayar_pada, dibuat_pada)
         VALUES (?,?,?,?,?,?,?,?, 'menunggu_pembayaran', ?, ?)`,
      ).run(kode, userId, courtId, date, hours[0], hours[hours.length - 1] + 1, hours.length, total, batasBayar, nowMs);
      const id = Number(r.lastInsertRowid);
      const insSlot = db.prepare("INSERT INTO slot_pesanan (pesanan_id, lapangan_id, tanggal, jam, harga_per_jam, aktif) VALUES (?,?,?,?,?,1)");
      for (const s of picked) insSlot.run(id, courtId, date, s.hour, s.price as number); // unique index menolak bentrokan
      db.prepare("INSERT INTO riwayat_status (pesanan_id, status_lama, status_baru, diubah_oleh, waktu, catatan) VALUES (?, NULL, 'menunggu_pembayaran', ?, ?, 'Pesanan dibuat')").run(id, userId, nowMs);

      return { id, kode, lapanganId: courtId, tanggal: date, jam: hours, totalHarga: total, batasBayarPada: batasBayar };
    });
  } catch (e) {
    if (e instanceof BookingError) throw e;
    if (isUniqueViolation(e)) throw new BookingError("SLOT_TAKEN"); // balapan: transaksi lain lebih dulu
    console.error("[createBooking]", e);
    throw new BookingError("INTERNAL");
  }
}
