import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout — hapus sesi lalu kembali ke Beranda. */
export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
