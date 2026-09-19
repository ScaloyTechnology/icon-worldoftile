import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { newSessionToken, sessionDigest, validToken } from "./crypto";
import { SESSION_SECONDS } from "./policy";
import { adminAuthConfiguration } from "./configuration";
export const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-icon_admin_session" : "icon_admin_session";

export function adminAuthConfigured() {
  return adminAuthConfiguration().configured;
}

export async function currentAdmin() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !validToken(token) || !adminAuthConfigured()) return null;
  try {
    const db = getDb();
    const tokenHash = sessionDigest(token);
    const session = await db.adminSession.findUnique({ where: { tokenHash }, include: { user: { include: { role: true } } } });
    const now = new Date();
    if (!session || session.expiresAt <= now || !session.user.active || !["SUPER_ADMIN", "ADMIN"].includes(session.user.role.name)) {
      if (session) await db.adminSession.deleteMany({ where: { id: session.id } });
      return null;
    }
    if (session.lastUsedAt.getTime() < now.getTime() - 5 * 60 * 1000) {
      await db.adminSession.update({ where: { id: session.id }, data: { lastUsedAt: now } });
    }
    return session.user;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  return user;
}

export async function createSession(userId: string) {
  const token = newSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_SECONDS * 1000);
  const db = getDb();
  await db.$transaction([
    db.adminSession.deleteMany({ where: { userId, expiresAt: { lte: now } } }),
    db.adminSession.create({ data: { tokenHash: sessionDigest(token), userId, expiresAt, lastUsedAt: now } }),
    db.adminUser.update({ where: { id: userId }, data: { lastLoginAt: now } }),
  ]);
  return { token, expiresAt };
}
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS };
