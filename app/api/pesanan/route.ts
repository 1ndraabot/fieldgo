import { NextRequest, NextResponse } from "next/server";
import { BookingError, ERROR_STATUS } from "@/lib/booking-errors";
import type { CreateOrderResponse } from "@/lib/booking-types";
import { createBooking } from "@/lib/server/bookings";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const reply = (body: CreateOrderResponse, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (e: BookingError) => reply({ ok: false, code: e.code, message: e.message }, ERROR_STATUS[e.code]);

/** POST /api/pesanan — buat pesanan. Body: { lapangan, tanggal, jam: number[] }. Field lain diabaikan. */
export async function POST(req: NextRequest) {
  // perlindungan CSRF dasar: hanya same-origin, hanya JSON
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return fail(new BookingError("INVALID_INPUT"));
  if (!req.headers.get("content-type")?.includes("application/json")) return fail(new BookingError("INVALID_INPUT"));

  let body: unknown = null;
  try { body = await req.json(); } catch { /* body tidak valid → ditolak oleh parseInput */ }

  try {
    const user = getSessionUser(); // identitas dari sesi server
    const o = createBooking(body, user?.id ?? null);
    return reply({ ok: true, kode: o.kode, redirect: `/pesanan/${o.kode}/bayar` }, 201);
  } catch (e) {
    return fail(e instanceof BookingError ? e : new BookingError("INTERNAL"));
  }
}
