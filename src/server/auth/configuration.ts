import "server-only";

/** Check runtime configuration only. Never expose connection strings or secrets. */
export function adminAuthConfiguration() {
  const issues: string[] = [];
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    issues.push("DATABASE_URL is missing");
  } else {
    try {
      const parsed = new URL(databaseUrl);
      if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) {
        issues.push("DATABASE_URL must be a valid PostgreSQL connection URL with a database name");
      }
    } catch {
      issues.push("DATABASE_URL must be a valid PostgreSQL connection URL");
    }
  }
  if (!process.env.ADMIN_SESSION_SECRET?.trim()) {
    issues.push("ADMIN_SESSION_SECRET is missing");
  } else if (process.env.ADMIN_SESSION_SECRET.trim().length < 32) {
    issues.push("ADMIN_SESSION_SECRET must contain at least 32 characters");
  }
  return {
    configured: issues.length === 0,
    message: issues.length
      ? `Administrator sign-in is unavailable: ${issues.join("; ")}. The site administrator must update the hosting application's server environment and restart the application.`
      : undefined,
  };
}
