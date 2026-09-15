-- Authentication audit fields for administrator accounts and sessions.
ALTER TABLE "AdminUser"
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "AdminSession"
ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "AdminUser_lastLoginAt_idx" ON "AdminUser"("lastLoginAt");
CREATE INDEX "AdminSession_lastUsedAt_idx" ON "AdminSession"("lastUsedAt");
