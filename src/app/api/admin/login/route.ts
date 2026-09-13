import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { credentialsSchema, sameOrigin } from "@/server/auth/policy";
import { digest, verifyPassword } from "@/server/auth/crypto";
import { cookieOptions, createSession, sessionCookie } from "@/server/auth/session";
import { consumeLoginAttempt } from "@/server/auth/rate-limit";
export const runtime = "nodejs";
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
// A syntactically valid scrypt hash forces an equal-cost check for unknown accounts.
const dummyHash = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;
export async function POST(request: NextRequest) {
  if (!sameOrigin(request.headers.get("origin"), process.env.SITE_URL ?? "http://localhost:3000")) return fail("Request origin could not be verified.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Unsupported request.", 415);
  if (!process.env.DATABASE_URL) return fail("Sign-in is not configured yet.", 503);
  try {
    const body = await request.text();
    if (body.length > 4096) return fail("Request too large.", 413);
    let raw: unknown;
    try { raw = JSON.parse(body); } catch { return fail("Invalid request.", 400); }
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return fail("Enter a valid email and password.", 400);
    const { email, password } = parsed.data;
    const accountKey = `account:${digest(email)}`;
    // The small admin audience permits a global abuse ceiling without trusting proxy IP headers.
    if (!await consumeLoginAttempt("global", 100) || !await consumeLoginAttempt(accountKey, 8)) return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } });
    const user = await getDb().adminUser.findUnique({ where: { email }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
    const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
    if (!user || !valid || !user.active || !user.role.permissions.some(entry => entry.permission.key === "dashboard:read")) return fail("Email or password is incorrect.", 401);
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie, session.token, cookieOptions);
    return response;
  } catch { return fail("Sign-in is temporarily unavailable. Please try again later.", 503); }
}
