import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { credentialsSchema, trustedRequestOrigin } from "@/server/auth/policy";
import { digest, verifyPassword } from "@/server/auth/crypto";
import { cookieOptions, createSession, sessionCookie } from "@/server/auth/session";
import { consumeLoginAttempt } from "@/server/auth/rate-limit";
import { adminAuthConfiguration } from "@/server/auth/configuration";
export const runtime = "nodejs";
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
// A valid bcrypt hash keeps unknown-account verification timing close to a real login.
const dummyHash = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Unsupported request.", 415);
  const configuration = adminAuthConfiguration();
  if (!configuration.configured) return fail(configuration.message ?? "Sign-in is not configured yet.", 503);
  try {
    const body = await request.text();
    if (body.length > 4096) return fail("Request too large.", 413);
    let raw: unknown;
    try { raw = JSON.parse(body); } catch { return fail("Invalid request.", 400); }
    const parsed = credentialsSchema.safeParse(raw);
    if (!parsed.success) return fail("Invalid email or password.", 400);
    const { email, password } = parsed.data;
    const accountKey = `account:${digest(email)}`;
    // The small admin audience permits a global abuse ceiling without trusting proxy IP headers.
    if (!await consumeLoginAttempt("global", 100) || !await consumeLoginAttempt(accountKey, 8)) return NextResponse.json({ error: "Too many attempts. Please try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900", "Cache-Control": "no-store" } });
    const user = await getDb().adminUser.findUnique({ where: { email }, include: { role: true } });
    const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
    if (!user || !valid || !user.active || !["SUPER_ADMIN", "ADMIN"].includes(user.role.name)) return fail("Invalid email or password.", 401);
    const session = await createSession(user.id);
    const response = NextResponse.json({ ok: true, redirectTo: "/admin/dashboard" }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie, session.token, cookieOptions);
    return response;
  } catch { return fail("Sign-in is temporarily unavailable. Please try again later.", 503); }
}
