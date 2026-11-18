import { BookingError } from "../lib/booking-errors.ts";
const { createBooking } = await import("../lib/server/bookings.ts");
const NOW = Date.UTC(2026, 10, 11, 3, 0);
try {
  createBooking({ lapangan: "futsal-arena-a", tanggal: process.argv[2], jam: [6] }, 1, NOW);
  console.log("OK");
} catch (e) { console.log(e instanceof BookingError ? e.code : "ERR " + e); }
