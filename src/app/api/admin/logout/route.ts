import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { sessionDigest, validToken } from "@/server/auth/crypto";
import { trustedRequestOrigin } from "@/server/auth/policy";
import { cookieOptions, sessionCookie } from "@/server/auth/session";
export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const token = request.cookies.get(sessionCookie)?.value;
  try {
    if (token && validToken(token)) await getDb().adminSession.deleteMany({ where: { tokenHash: sessionDigest(token) } });
  } catch {
    // The browser session is still cleared below. Any unreachable database
    // session remains unusable without the cookie and expires automatically.
  }
  // Keep the redirect relative so an internal Nginx upstream host/port can
  // never leak into the browser-facing Location header.
  const response = new NextResponse(null, {
    status: 303,
    headers: { "Cache-Control": "no-store", Location: "/admin/login" },
  });
  response.cookies.set(sessionCookie, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
