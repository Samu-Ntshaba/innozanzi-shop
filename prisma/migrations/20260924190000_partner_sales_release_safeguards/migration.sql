-- Forward-only partner-sales release safeguards.
-- Legacy enums, tables, rows, and the 20260922190000 migration remain unchanged.
ALTER TABLE "PartnerCatalogueAssignment" ADD COLUMN "sourceSnapshot" JSONB;
ALTER TABLE "PartnerShowcaseItem" ADD COLUMN "sourceSnapshot" JSONB;
ALTER TABLE "PartnerQuoteCase" ADD COLUMN "clientSnapshot" JSONB;
ALTER TABLE "PartnerQuoteCase" ADD COLUMN "deliveryInstructions" TEXT;
ALTER TABLE "PartnerPayoutBatch" ADD COLUMN "statementPayload" JSONB;
ALTER TABLE "PartnerPayoutBatch" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "PartnerPayoutBatch_idempotencyKey_key" ON "PartnerPayoutBatch"("idempotencyKey");

-- A release must remain disabled until an explicit controlled rollout update.
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
