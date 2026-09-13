import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, digest, newSessionToken, validToken } from "../src/server/auth/crypto";
import { sameOrigin, safeAdminRedirect, bootstrapSchema } from "../src/server/auth/policy";
import { mediaUrl } from "../src/lib/media";
test("password hash is salted and rejects incorrect credentials and malformed hashes", async () => {
  const a = await hashPassword("long-test-password-123"); const b = await hashPassword("long-test-password-123");
  assert.notEqual(a, b); assert.ok(await verifyPassword("long-test-password-123", a)); assert.equal(await verifyPassword("wrong", a), false); assert.equal(await verifyPassword("value", "scrypt$bad$hash"), false);
});
test("sessions are opaque, random, and stored as digests", () => { const a = newSessionToken(); assert.ok(validToken(a)); assert.notEqual(a, newSessionToken()); assert.notEqual(digest(a), a); assert.equal(validToken("../admin"), false); });
test("cross-origin and missing-origin mutations are rejected", () => { assert.ok(sameOrigin("https://icon.example", "https://icon.example")); assert.equal(sameOrigin("https://evil.example", "https://icon.example"), false); assert.equal(sameOrigin(null, "https://icon.example"), false); assert.equal(sameOrigin("null", "https://icon.example"), false); });
test("redirects cannot leave admin or create a login loop", () => { assert.equal(safeAdminRedirect("https://evil.example"), "/admin"); assert.equal(safeAdminRedirect("//evil.example"), "/admin"); assert.equal(safeAdminRedirect("/admin/login"), "/admin"); assert.equal(safeAdminRedirect("/admin/products"), "/admin/products"); });
test("bootstrap requires a strong-length password", () => { assert.equal(bootstrapSchema.safeParse({ email: "admin@example.com", password: "password" }).success, false); });
test("media keys cannot traverse paths or use insecure CDN URLs", () => { assert.throws(() => mediaUrl("../private.env")); assert.throws(() => mediaUrl("tile.webp", "http://cdn.example")); assert.equal(mediaUrl("tile.webp", "https://cdn.example/assets"), "https://cdn.example/assets/tile.webp"); });
