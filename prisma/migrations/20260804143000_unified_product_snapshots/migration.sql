ALTER TABLE "QuotationItem"
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "supplierId" UUID,
  ADD COLUMN "supplierSku" TEXT,
  ADD COLUMN "sourceSnapshot" JSONB,
  ADD COLUMN "pricingRule" TEXT,
  ADD COLUMN "markupPercent" DECIMAL(7,4),
  ADD COLUMN "stockSnapshot" INTEGER;

ALTER TABLE "OrderItem"
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "supplierId" UUID,
  ADD COLUMN "supplierSku" TEXT,
  ADD COLUMN "sourceSnapshot" JSONB,
  ADD COLUMN "pricingRule" TEXT,
  ADD COLUMN "markupPercent" DECIMAL(7,4),
  ADD COLUMN "stockSnapshot" INTEGER;

ALTER TABLE "Quotation"
  ADD COLUMN "acceptedVersion" INTEGER,
  ADD COLUMN "acceptedAmount" DECIMAL(19,4),
  ADD COLUMN "acceptedById" UUID,
  ADD COLUMN "acceptanceMetadata" JSONB;

CREATE INDEX "QuotationItem_sourceType_sourceId_idx" ON "QuotationItem"("sourceType", "sourceId");
CREATE INDEX "OrderItem_sourceType_sourceId_idx" ON "OrderItem"("sourceType", "sourceId");
