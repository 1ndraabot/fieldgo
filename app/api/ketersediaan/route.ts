import { NextRequest, NextResponse } from "next/server";
import { addDays } from "@/lib/datetime";
import type { SlotsResponse } from "@/lib/booking-types";
import { getDaySlots } from "@/lib/server/repo";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** GET /api/ketersediaan?lapangan=ID&tanggal=YYYY-MM-DD — status 18 slot; publik, tanpa data pemilik pesanan. */
export function GET(req: NextRequest) {
  const lapangan = req.nextUrl.searchParams.get("lapangan") ?? "";
  const tanggal = req.nextUrl.searchParams.get("tanggal") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || addDays(tanggal, 0) !== tanggal)
    return NextResponse.json({ ok: false, message: "Tanggal tidak valid." }, { status: 422, headers: noStore });
  try {
    const slots = getDaySlots(lapangan, tanggal, Date.now());
    if (!slots) return NextResponse.json({ ok: false, message: "Lapangan tidak ditemukan." }, { status: 404, headers: noStore });
    const body: SlotsResponse = { ok: true, lapangan, tanggal, slots };
    return NextResponse.json(body, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, message: "Ketersediaan belum bisa dimuat." }, { status: 500, headers: noStore });
  }
}
