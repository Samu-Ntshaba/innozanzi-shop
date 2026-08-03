ALTER TABLE "ComboCampaignItem" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "ComboCampaignItem" ADD COLUMN "supplierCatalogueProductId" UUID;
CREATE INDEX "ComboCampaignItem_supplierCatalogueProductId_idx" ON "ComboCampaignItem"("supplierCatalogueProductId");
ALTER TABLE "ComboCampaignItem" ADD CONSTRAINT "ComboCampaignItem_supplierCatalogueProductId_fkey" FOREIGN KEY ("supplierCatalogueProductId") REFERENCES "SupplierCatalogueProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "ComboCampaignSetting" SET "dailyEnabled"=true,"weeklyEnabled"=true,"monthlyEnabled"=true,"automaticPublication"=true,"automaticSlider"=true,"minimumProfitMargin"=GREATEST("minimumProfitMargin",5),"targetProfitMargin"=GREATEST("targetProfitMargin",10) WHERE "id"='default';
