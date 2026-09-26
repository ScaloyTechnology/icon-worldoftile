import { z } from "zod";
export const credentialsSchema = z.object({ email: z.email().max(254).transform(value => value.trim().toLowerCase()), password: z.string().min(1).max(256) });
export const bootstrapSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
  password: z.string().min(14).max(256),
  role: z.enum(["SUPER_ADMIN", "ADMIN"]).default("SUPER_ADMIN"),
});
export const SESSION_SECONDS = 60 * 60 * 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function webOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || null;
}

export function sameOrigin(actual: string | null, expected: string) {
  const actualOrigin = webOrigin(actual);
  const expectedOrigin = webOrigin(expected);
  return Boolean(actualOrigin && expectedOrigin && actualOrigin === expectedOrigin);
}

type OriginRequest = Readonly<{
  headers: Readonly<{ get(name: string): string | null }>;
  nextUrl: Readonly<{ origin: string; protocol: string }>;
}>;

export function trustedRequestOrigin(request: OriginRequest) {
  const actual = request.headers.get("origin");
  if (!actual) return false;

  // Nginx may append comma-separated forwarding values. The first value is the
  // browser-facing hop; the proxy must overwrite these headers at the edge.
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const host = forwardedHost ?? firstForwardedValue(request.headers.get("host"));
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProtocol ?? request.nextUrl.protocol.replace(":", "");
  const forwardedOrigin = host && (protocol === "http" || protocol === "https")
    ? webOrigin(`${protocol}://${host}`)
    : null;
  const expectedOrigins = [
    request.nextUrl.origin,
    process.env.SITE_URL,
    forwardedOrigin,
  ].map(webOrigin).filter((value): value is string => Boolean(value));

  if (expectedOrigins.some((expected) => sameOrigin(actual, expected))) return true;

  // Browsers treat these as separate origins, but both names refer to the same
  // loopback interface during local development. Production never gets this exception.
  if (process.env.NODE_ENV !== "production") {
    try {
      const actualUrl = new URL(actual);
      const configuredLoopback = expectedOrigins.some((expected) => {
        try {
          const expectedUrl = new URL(expected);
          return (
            ["localhost", "127.0.0.1"].includes(expectedUrl.hostname) &&
            expectedUrl.protocol === actualUrl.protocol &&
            expectedUrl.port === actualUrl.port
          );
        } catch {
          return false;
        }
      });
      return ["localhost", "127.0.0.1"].includes(actualUrl.hostname) && configuredLoopback;
    } catch {
      return false;
    }
  }

  return false;
}
export function safeAdminRedirect(value: string | null) { return value && /^\/admin(?:\/[a-z0-9-]+)*$/.test(value) && value !== "/admin/login" ? value : "/admin"; }
