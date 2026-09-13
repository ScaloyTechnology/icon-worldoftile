import { z } from "zod";
export const credentialsSchema = z.object({ email: z.email().max(254).transform(value => value.trim().toLowerCase()), password: z.string().min(1).max(256) });
export const bootstrapSchema = z.object({ email: z.email().max(254).transform(value => value.toLowerCase()), password: z.string().min(14).max(256) });
export const SESSION_SECONDS = 60 * 60 * 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export function sameOrigin(actual: string | null, expected: string) {
  if (!actual) return false;
  try { return new URL(actual).origin === new URL(expected).origin; } catch { return false; }
}
export function safeAdminRedirect(value: string | null) { return value && /^\/admin(?:\/[a-z0-9-]+)*$/.test(value) && value !== "/admin/login" ? value : "/admin"; }
