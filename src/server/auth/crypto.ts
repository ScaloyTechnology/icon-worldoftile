import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, stored] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !stored || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(stored)) return false;
  const derived = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(Buffer.from(stored, "hex"), derived);
}
export function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function newSessionToken() { return randomBytes(32).toString("hex"); }
export function validToken(token: string) { return /^[a-f0-9]{64}$/.test(token); }
