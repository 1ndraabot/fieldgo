import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const USERS: Record<string, number> = { verified: 1, unverified: 2, lain: 3 };

/**
 * Login DEMO untuk pengembangan sampai halaman /masuk dibangun.
 *   /api/dev/login?as=verified|unverified|lain&next=/pesan
 * Nonaktif di produksi kecuali ALLOW_DEV_LOGIN=1.
 */
export function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_LOGIN !== "1") return new NextResponse(null, { status: 404 });
  const id = USERS[req.nextUrl.searchParams.get("as") ?? "verified"];
  if (!id) return NextResponse.json({ message: "Gunakan as=verified|unverified|lain" }, { status: 400 });
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/"; // cegah open redirect
  const res = NextResponse.redirect(new URL(safe, req.url));
  res.cookies.set(SESSION_COOKIE, signSession(id), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE, secure: process.env.NODE_ENV === "production",
  });
  return res;
}
