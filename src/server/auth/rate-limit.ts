import "server-only";
import { getDb } from "@/server/db";
import { LOGIN_WINDOW_MS } from "./policy";
/** Atomic database upsert: concurrent instances cannot bypass the window. */
export async function consumeLoginAttempt(key: string, maximum: number) {
  const now = new Date();
  const expires = new Date(now.getTime() + LOGIN_WINDOW_MS);
  const records = await getDb().$queryRaw<{ attempts: number }[]>`
    INSERT INTO "LoginThrottle" ("key", "attempts", "expiresAt") VALUES (${key}, 1, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "LoginThrottle"."expiresAt" <= ${now} THEN 1 ELSE "LoginThrottle"."attempts" + 1 END,
      "expiresAt" = CASE WHEN "LoginThrottle"."expiresAt" <= ${now} THEN ${expires} ELSE "LoginThrottle"."expiresAt" END
    RETURNING "attempts"`;
  return (records[0]?.attempts ?? maximum + 1) <= maximum;
}
