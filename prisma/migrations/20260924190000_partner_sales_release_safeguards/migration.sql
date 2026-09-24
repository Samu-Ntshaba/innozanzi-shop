-- Forward-only partner-sales release safeguards.
-- The original partner migration is immutable; this migration contains only
-- the later schema delta and a safe rollout default.
ALTER TABLE "PartnerCatalogueAssignment" ADD COLUMN IF NOT EXISTS "sourceSnapshot" JSONB;
ALTER TABLE "PartnerShowcaseItem" ADD COLUMN IF NOT EXISTS "sourceSnapshot" JSONB;
ALTER TABLE "PartnerQuoteCase" ADD COLUMN IF NOT EXISTS "clientSnapshot" JSONB;
ALTER TABLE "PartnerQuoteCase" ADD COLUMN IF NOT EXISTS "deliveryInstructions" TEXT;
ALTER TABLE "PartnerPayoutBatch" ADD COLUMN IF NOT EXISTS "statementPayload" JSONB;
ALTER TABLE "PartnerPayoutBatch" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerPayoutBatch_idempotencyKey_key"
  ON "PartnerPayoutBatch"("idempotencyKey");

-- Keep the feature disabled until an explicit controlled rollout update. This
-- is safe to re-run and does not remove or rewrite partner business records.
INSERT INTO "SiteSetting" ("id", "key", "value", "description", "isSensitive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'partner_sales.channel.v1',
  '{"enabled":false}'::jsonb,
  'Global partner sales channel rollout control',
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "value" = '{"enabled":false}'::jsonb,
  "description" = EXCLUDED."description",
  "isSensitive" = EXCLUDED."isSensitive",
  "updatedAt" = CURRENT_TIMESTAMP;
