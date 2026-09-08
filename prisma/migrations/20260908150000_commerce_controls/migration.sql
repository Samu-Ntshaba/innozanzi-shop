ALTER TYPE "PaymentProvider" ADD VALUE 'OZOW';
ALTER TYPE "PaymentProvider" ADD VALUE 'PAYFAST';
ALTER TABLE "Coupon" ADD COLUMN "advertised" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "automatic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Supplier" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING', ADD COLUMN "purchasingEnabled" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Supplier" SET "approvalStatus"='APPROVED', "purchasingEnabled"=true WHERE "id" IN (SELECT "supplierId" FROM "SupplierFeed" WHERE "provider"='SYNTECH');
ALTER TABLE "SupplierCatalogueProduct" ADD COLUMN "identityKey" TEXT, ADD COLUMN "displayPreferred" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Payment" ADD COLUMN "fundsAvailableAt" TIMESTAMP(3);
CREATE TABLE "GatewayEvent" ("id" UUID NOT NULL, "provider" TEXT NOT NULL, "eventId" TEXT NOT NULL, "paymentId" UUID NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "GatewayEvent_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "GatewayEvent_provider_eventId_key" ON "GatewayEvent"("provider","eventId");

CREATE INDEX "SupplierCatalogueProduct_identityKey_idx" ON "SupplierCatalogueProduct"("identityKey");
CREATE INDEX "SupplierCatalogueProduct_displayPreferred_lastSeenAt_idx" ON "SupplierCatalogueProduct"("displayPreferred","lastSeenAt");
INSERT INTO "Supplier" ("id","companyName","approvalStatus","purchasingEnabled","accountNumber","paymentTerms","createdAt","updatedAt")
VALUES ('86000000-0000-4000-8000-000000000002','Pinnacle ICT','APPROVED',false,'INN038','COD',NOW(),NOW()) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "SupplierFeed" ("id","supplierId","provider","adapter","fullFeedUrl","enabled","scheduleMinutes","createdAt","updatedAt")
VALUES ('86000000-0000-4000-8000-000000000003','86000000-0000-4000-8000-000000000002','PINNACLE','PINNACLE_XML','ENV:PINNACLE_XML_FEED_URL',false,1440,NOW(),NOW()) ON CONFLICT ("supplierId","provider") DO NOTHING;
UPDATE "SupplierFeed" SET "scheduleMinutes"=1440 WHERE "provider"='SYNTECH';
