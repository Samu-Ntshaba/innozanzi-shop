import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

// Atomic database counter: shared across workers and charged before work starts.
export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  if (!Number.isFinite(limit) || limit < 1) return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  const hashed = createHash("sha256").update(key).digest("hex");
  const rows = await prisma.$queryRaw<Array<{ count: number; retry: number }>>`
    INSERT INTO "SecurityRateLimit" ("key", "count", "resetAt")
    VALUES (${hashed}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "SecurityRateLimit"."resetAt" <= NOW() THEN 1 ELSE LEAST("SecurityRateLimit"."count" + 1, ${Math.floor(limit) + 1}) END,
      "resetAt" = CASE WHEN "SecurityRateLimit"."resetAt" <= NOW() THEN NOW() + ${windowMs} * INTERVAL '1 millisecond' ELSE "SecurityRateLimit"."resetAt" END
    RETURNING "count", CEIL(EXTRACT(EPOCH FROM ("resetAt" - NOW())))::integer AS retry`;
  return { allowed: rows[0].count <= limit, retryAfterSeconds: rows[0].count <= limit ? 0 : Math.max(1, rows[0].retry) };
}
export async function consumeAuthAttempt(key: string, limit = 5, windowMs = 15 * 60_000) {
  return (await consumeRateLimit(key, limit, windowMs)).allowed;
}
export async function clearAuthAttempts(key: string) {
  const hashed = createHash("sha256").update(key).digest("hex");
  await prisma.$executeRaw`DELETE FROM "SecurityRateLimit" WHERE "key" = ${hashed}`;
}
