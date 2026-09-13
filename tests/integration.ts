import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword, digest } from "../src/server/auth/crypto";

const base = process.env.SITE_URL ?? "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
const loopback = (host: string) => ["127.0.0.1", "localhost", "[::1]"].includes(host);
if (process.env.ICON_INTEGRATION_TESTS !== "true" || !databaseUrl || !loopback(new URL(base).hostname) || !loopback(new URL(databaseUrl).hostname)) throw new Error("Integration tests require explicit opt-in and loopback app/database URLs.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const email = `integration-${randomBytes(8).toString("hex")}@example.invalid`;
const password = randomBytes(24).toString("hex");
const userId = `integration-${randomBytes(8).toString("hex")}`;
const headers = { "Content-Type": "application/json", Origin: base };
const login = (pass = password, origin = base) => fetch(`${base}/api/admin/login`, { method: "POST", headers: { ...headers, Origin: origin }, body: JSON.stringify({ email, password: pass }) });
async function main() {
  const role = await db.role.findUniqueOrThrow({ where: { name: "Administrator" } });
  const before = { products: await db.product.count(), enquiries: await db.enquiry.count() };
  await db.adminUser.create({ data: { id: userId, name: "Temporary integration test", email, passwordHash: await hashPassword(password), roleId: role.id } });
  try {
    const anonymous = await fetch(`${base}/admin`, { redirect: "manual" });
    assert.equal(anonymous.status, 307); assert.ok(anonymous.headers.get("location")?.includes("/admin/login"));
    assert.equal((await login(password, "https://untrusted.example")).status, 403);
    assert.equal((await login("incorrect")).status, 401);
    const signedIn = await login(); assert.equal(signedIn.status, 200);
    const setCookie = signedIn.headers.get("set-cookie")!;
    assert.match(setCookie, /httponly/i); assert.match(setCookie, /samesite=lax/i);
    const cookie = setCookie.split(";")[0];
    if (!cookie) throw new Error("Login response did not include a session cookie");
    const token = cookie.split("=")[1];
    if (!token) throw new Error("Login response included an invalid session cookie");
    const session = await db.adminSession.findUniqueOrThrow({ where: { tokenHash: digest(token) } });
    assert.notEqual(session.tokenHash, token);
    const dashboard = await fetch(`${base}/admin`, { headers: { Cookie: cookie } });
    assert.equal(dashboard.status, 200); assert.match(await dashboard.text(), /in the database/);
    await db.adminUser.update({ where: { id: userId }, data: { active: false } });
    assert.equal((await fetch(`${base}/admin`, { headers: { Cookie: cookie }, redirect: "manual" })).status, 307);
    await db.adminUser.update({ where: { id: userId }, data: { active: true } });
    await db.adminSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await fetch(`${base}/admin`, { headers: { Cookie: cookie }, redirect: "manual" })).status, 307);
    await db.adminSession.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + 60000) } });
    const logout = await fetch(`${base}/api/admin/logout`, { method: "POST", headers: { Origin: base, Cookie: cookie }, redirect: "manual" });
    assert.equal(logout.status, 303); assert.equal(await db.adminSession.count({ where: { userId } }), 0);
    assert.equal((await fetch(`${base}/admin`, { headers: { Cookie: cookie }, redirect: "manual" })).status, 307);
    await db.loginThrottle.upsert({ where: { key: `account:${digest(email)}` }, create: { key: `account:${digest(email)}`, attempts: 8, expiresAt: new Date(Date.now() + 60000) }, update: { attempts: 8, expiresAt: new Date(Date.now() + 60000) } });
    assert.equal((await login()).status, 429);
    const routes = ["/", "/meet-icon", "/products?look=wood", "/applications?application=outdoor", "/projects", "/catalogues", "/technical-specs", "/contact", "/admin/login", "/robots.txt", "/sitemap.xml", "/media/hero-room.webp"];
    for (const route of routes) assert.equal((await fetch(`${base}${route}`)).status, 200, route);
    assert.equal((await fetch(`${base}/products/unverified-product`)).status, 404);
    assert.equal((await fetch(`${base}/projects/unverified-project`)).status, 404);
    assert.deepEqual({ products: await db.product.count(), enquiries: await db.enquiry.count() }, before);
    console.log("PASS: anonymous redirect, CSRF rejection, invalid login, real session, dashboard, disabled user, expiry, logout, token revocation, throttling, 12 public endpoints and missing records.");
  } finally {
    await db.adminUser.deleteMany({ where: { id: userId } });
    await db.loginThrottle.deleteMany({ where: { key: `account:${digest(email)}` } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Integration check failed"); process.exitCode = 1; });
