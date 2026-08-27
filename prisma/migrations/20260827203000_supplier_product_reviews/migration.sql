ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN "supplierCatalogueProductId" UUID;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_supplierCatalogueProductId_fkey"
  FOREIGN KEY ("supplierCatalogueProductId") REFERENCES "SupplierCatalogueProduct"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_exactly_one_product_check"
  CHECK (("productId" IS NOT NULL) <> ("supplierCatalogueProductId" IS NOT NULL));

CREATE UNIQUE INDEX "Review_supplierCatalogueProductId_userId_key"
  ON "Review"("supplierCatalogueProductId", "userId");
CREATE INDEX "Review_supplierCatalogueProductId_status_createdAt_idx"
  ON "Review"("supplierCatalogueProductId", "status", "createdAt");
