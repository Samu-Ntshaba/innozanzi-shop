CREATE TABLE "SecurityRateLimit" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMPTZ NOT NULL
);
CREATE INDEX "SecurityRateLimit_resetAt_idx" ON "SecurityRateLimit" ("resetAt");
