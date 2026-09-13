import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { digest, validToken } from "@/server/auth/crypto";
import { sameOrigin } from "@/server/auth/policy";
import { cookieOptions, sessionCookie } from "@/server/auth/session";
export async function POST(request: NextRequest) {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  if (!sameOrigin(request.headers.get("origin"), base)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const token = request.cookies.get(sessionCookie)?.value;
  try {
    if (token && validToken(token)) await getDb().adminSession.deleteMany({ where: { tokenHash: digest(token) } });
  } catch { return NextResponse.json({ error: "Sign-out could not be completed. Please try again." }, { status: 503 }); }
  const response = NextResponse.redirect(new URL("/admin/login", base), 303);
  response.cookies.set(sessionCookie, "", { ...cookieOptions, maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
