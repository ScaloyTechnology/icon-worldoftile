import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db";
import { digest, newSessionToken, validToken } from "./crypto";
import { SESSION_SECONDS } from "./policy";
export const sessionCookie = process.env.NODE_ENV === "production" ? "__Host-icon_session" : "icon_session";
export async function currentAdmin() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token || !validToken(token) || !process.env.DATABASE_URL) return null;
  const session = await getDb().adminSession.findUnique({ where: { tokenHash: digest(token) }, include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return session.user;
}
export async function requireAdmin(permission = "dashboard:read") {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  if (!user.role.permissions.some(entry => entry.permission.key === permission)) redirect("/admin/login?error=access");
  return user;
}
export async function createSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await getDb().adminSession.create({ data: { tokenHash: digest(token), userId, expiresAt } });
  return { token, expiresAt };
}
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: SESSION_SECONDS };
