import { createHash, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, encoded: string) {
  if (!/^\$2[aby]\$\d{2}\$/.test(encoded)) return false;
  try { return await bcrypt.compare(password, encoded); } catch { return false; }
}

export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function sessionDigest(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function newSessionToken() { return randomBytes(48).toString("base64url"); }
export function validToken(token: string) { return /^[A-Za-z0-9_-]{64}$/.test(token); }
