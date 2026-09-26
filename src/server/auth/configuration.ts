import "server-only";

/** Check runtime configuration only. Never expose connection strings or secrets. */
export function adminAuthConfiguration() {
  const issues: string[] = [];
  const insecureHttpValue = process.env.ADMIN_ALLOW_INSECURE_HTTP?.trim().toLowerCase();
  if (insecureHttpValue && !["true", "false"].includes(insecureHttpValue)) {
    issues.push("ADMIN_ALLOW_INSECURE_HTTP must be true or false");
  }
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
  const siteUrl = process.env.SITE_URL?.trim();
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
        issues.push("SITE_URL must be a valid HTTP or HTTPS public URL");
      }
      if (insecureHttpValue === "true" && parsed.protocol !== "http:") {
        issues.push("ADMIN_ALLOW_INSECURE_HTTP can only be enabled when SITE_URL uses HTTP");
      }
    } catch {
      issues.push("SITE_URL must be a valid HTTP or HTTPS public URL");
    }
  } else if (insecureHttpValue === "true") {
    issues.push("SITE_URL is required when ADMIN_ALLOW_INSECURE_HTTP is enabled");
  }
  return {
    configured: issues.length === 0,
    message: issues.length
      ? `Administrator sign-in is unavailable: ${issues.join("; ")}. The site administrator must update the hosting application's server environment and restart the application.`
      : undefined,
  };
}
