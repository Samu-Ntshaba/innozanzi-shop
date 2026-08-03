CREATE TABLE "SupplierFeed" (
  "id" UUID NOT NULL, "supplierId" UUID NOT NULL, "provider" TEXT NOT NULL, "adapter" TEXT NOT NULL,
  "fullFeedUrl" TEXT NOT NULL, "updateFeedUrl" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true,
  "scheduleMinutes" INTEGER NOT NULL DEFAULT 30, "lastFullSyncAt" TIMESTAMP(3), "lastIncrementalSyncAt" TIMESTAMP(3),
  "nextSyncAt" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SupplierFeed_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupplierCatalogueProduct" (
  "id" UUID NOT NULL, "feedId" UUID NOT NULL, "supplierId" UUID NOT NULL, "supplierProductId" TEXT NOT NULL,
  "supplierSku" TEXT NOT NULL, "manufacturerSku" TEXT, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "brand" TEXT,
  "category" TEXT, "categoryPath" TEXT, "description" TEXT, "shortDescription" TEXT, "specifications" JSONB,
  "images" TEXT[] DEFAULT ARRAY[]::TEXT[], "supplierUrl" TEXT, "stock" INTEGER NOT NULL DEFAULT 0, "stockByLocation" JSONB,
  "availability" TEXT NOT NULL, "costPrice" DECIMAL(19,4), "recommendedRetail" DECIMAL(19,4), "promotionalPrice" DECIMAL(19,4),
  "promotionStartsAt" TIMESTAMP(3), "promotionEndsAt" TIMESTAMP(3), "currency" CHAR(3) NOT NULL DEFAULT 'ZAR',
  "weightGrams" DECIMAL(12,3), "lengthCm" DECIMAL(12,3), "widthCm" DECIMAL(12,3), "heightCm" DECIMAL(12,3),
  "warranty" TEXT, "barcode" TEXT, "nextShipmentAt" TIMESTAMP(3), "sourceUpdatedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "active" BOOLEAN NOT NULL DEFAULT true, "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierCatalogueProduct_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SupplierSyncRun" (
  "id" UUID NOT NULL, "feedId" UUID NOT NULL, "supplierId" UUID NOT NULL, "mode" TEXT NOT NULL, "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3), "recordsReceived" INTEGER NOT NULL DEFAULT 0,
  "recordsAdded" INTEGER NOT NULL DEFAULT 0, "recordsUpdated" INTEGER NOT NULL DEFAULT 0, "recordsRemoved" INTEGER NOT NULL DEFAULT 0,
  "recordsSkipped" INTEGER NOT NULL DEFAULT 0, "error" TEXT, "diagnostics" JSONB, "triggeredById" UUID,
  CONSTRAINT "SupplierSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierFeed_supplierId_provider_key" ON "SupplierFeed"("supplierId", "provider");
CREATE INDEX "SupplierFeed_enabled_nextSyncAt_idx" ON "SupplierFeed"("enabled", "nextSyncAt");
CREATE UNIQUE INDEX "SupplierCatalogueProduct_slug_key" ON "SupplierCatalogueProduct"("slug");
CREATE UNIQUE INDEX "SupplierCatalogueProduct_feedId_supplierProductId_key" ON "SupplierCatalogueProduct"("feedId", "supplierProductId");
CREATE INDEX "SupplierCatalogueProduct_active_name_idx" ON "SupplierCatalogueProduct"("active", "name");
CREATE INDEX "SupplierCatalogueProduct_active_category_idx" ON "SupplierCatalogueProduct"("active", "category");
CREATE INDEX "SupplierCatalogueProduct_active_brand_idx" ON "SupplierCatalogueProduct"("active", "brand");
CREATE INDEX "SupplierCatalogueProduct_supplierSku_idx" ON "SupplierCatalogueProduct"("supplierSku");
CREATE INDEX "SupplierSyncRun_feedId_startedAt_idx" ON "SupplierSyncRun"("feedId", "startedAt");
CREATE INDEX "SupplierSyncRun_status_startedAt_idx" ON "SupplierSyncRun"("status", "startedAt");
ALTER TABLE "SupplierFeed" ADD CONSTRAINT "SupplierFeed_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE;
ALTER TABLE "SupplierCatalogueProduct" ADD CONSTRAINT "SupplierCatalogueProduct_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "SupplierFeed"("id") ON DELETE CASCADE;
ALTER TABLE "SupplierCatalogueProduct" ADD CONSTRAINT "SupplierCatalogueProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE;
ALTER TABLE "SupplierSyncRun" ADD CONSTRAINT "SupplierSyncRun_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "SupplierFeed"("id") ON DELETE CASCADE;
ALTER TABLE "SupplierSyncRun" ADD CONSTRAINT "SupplierSyncRun_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE;
ALTER TABLE "QuotationRequestItem" ADD COLUMN "supplierId" UUID, ADD COLUMN "supplierProductId" TEXT, ADD COLUMN "supplierSku" TEXT, ADD COLUMN "productSnapshot" JSONB;
