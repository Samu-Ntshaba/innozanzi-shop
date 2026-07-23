CREATE TYPE "QuotationOrigin" AS ENUM ('CUSTOMER_REQUEST', 'MANUAL', 'PARTNER');

ALTER TABLE "Quotation"
  ADD COLUMN "origin" "QuotationOrigin" NOT NULL DEFAULT 'CUSTOMER_REQUEST',
  ADD COLUMN "createdById" UUID;

ALTER TABLE "Shipment"
  ADD COLUMN "deliveryCompany" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "estimatedDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "deliveryNoteNumber" TEXT,
  ADD COLUMN "deliveryInstructions" TEXT;

CREATE UNIQUE INDEX "Shipment_deliveryNoteNumber_key" ON "Shipment"("deliveryNoteNumber");
CREATE INDEX "Quotation_origin_status_createdAt_idx" ON "Quotation"("origin", "status", "createdAt");
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
