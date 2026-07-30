CREATE TYPE "ComboCampaignType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE "ComboCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED', 'SOLD_OUT');

CREATE TABLE "ComboCampaign" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "headline" TEXT NOT NULL, "description" TEXT NOT NULL, "benefits" TEXT,
  "type" "ComboCampaignType" NOT NULL, "status" "ComboCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "targetAudience" TEXT NOT NULL,
  "normalPrice" DECIMAL(19,4) NOT NULL, "comboPrice" DECIMAL(19,4) NOT NULL,
  "estimatedCost" DECIMAL(19,4) NOT NULL, "serviceCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "deliveryCost" DECIMAL(19,4) NOT NULL DEFAULT 0, "paymentCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "grossProfit" DECIMAL(19,4) NOT NULL, "profitMargin" DECIMAL(9,4) NOT NULL,
  "imageUrl" TEXT, "mobileImageUrl" TEXT, "callToAction" TEXT NOT NULL DEFAULT 'Request a Quote',
  "emailSubject" TEXT, "emailPreview" TEXT, "emailBody" TEXT, "sliderHeadline" TEXT, "sliderText" TEXT,
  "socialCaption" TEXT, "sliderVisible" BOOLEAN NOT NULL DEFAULT false, "featured" BOOLEAN NOT NULL DEFAULT false,
  "aiGenerated" BOOLEAN NOT NULL DEFAULT false, "deliveryIncluded" BOOLEAN NOT NULL DEFAULT false,
  "vatIncluded" BOOLEAN NOT NULL DEFAULT true, "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3), "approvedById" UUID, "createdById" UUID, "updatedById" UUID,
  "marketingBlockId" UUID, "emailCampaignId" UUID, "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComboCampaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComboCampaignItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "campaignId" UUID NOT NULL, "productId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL, "productName" TEXT NOT NULL, "sku" TEXT NOT NULL,
  "unitNormalPrice" DECIMAL(19,4) NOT NULL, "unitCost" DECIMAL(19,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComboCampaignItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComboQuotationSnapshot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "campaignId" UUID NOT NULL, "quotationRequestId" UUID NOT NULL,
  "campaignName" TEXT NOT NULL, "normalPrice" DECIMAL(19,4) NOT NULL, "comboPrice" DECIMAL(19,4) NOT NULL,
  "discountAmount" DECIMAL(19,4) NOT NULL, "estimatedCost" DECIMAL(19,4) NOT NULL,
  "expectedGrossProfit" DECIMAL(19,4) NOT NULL, "items" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ComboQuotationSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComboCampaignEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "campaignId" UUID NOT NULL, "type" TEXT NOT NULL,
  "channel" TEXT, "value" DECIMAL(19,4), "data" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComboCampaignEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComboCampaignSetting" (
  "id" TEXT NOT NULL DEFAULT 'default', "minimumProfitAmount" DECIMAL(19,4) NOT NULL DEFAULT 1,
  "minimumProfitMargin" DECIMAL(9,4) NOT NULL DEFAULT 1, "maximumDiscountPercent" DECIMAL(9,4) NOT NULL DEFAULT 50,
  "lowMarginRequiresApproval" BOOLEAN NOT NULL DEFAULT true, "maximumProducts" INTEGER NOT NULL DEFAULT 5,
  "maximumActiveCampaigns" INTEGER NOT NULL DEFAULT 5, "dailyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "weeklyEnabled" BOOLEAN NOT NULL DEFAULT false, "monthlyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "automaticPublication" BOOLEAN NOT NULL DEFAULT false, "automaticEmail" BOOLEAN NOT NULL DEFAULT false,
  "automaticSlider" BOOLEAN NOT NULL DEFAULT false, "targetProfitMargin" DECIMAL(9,4) NOT NULL DEFAULT 10,
  "prioritisedCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[], "excludedCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComboCampaignSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ComboCampaign_slug_key" ON "ComboCampaign"("slug");
CREATE INDEX "ComboCampaign_status_startsAt_endsAt_idx" ON "ComboCampaign"("status","startsAt","endsAt");
CREATE INDEX "ComboCampaign_type_status_idx" ON "ComboCampaign"("type","status");
CREATE INDEX "ComboCampaign_featured_status_idx" ON "ComboCampaign"("featured","status");
CREATE UNIQUE INDEX "ComboCampaignItem_campaignId_productId_key" ON "ComboCampaignItem"("campaignId","productId");
CREATE INDEX "ComboCampaignItem_productId_idx" ON "ComboCampaignItem"("productId");
CREATE UNIQUE INDEX "ComboQuotationSnapshot_quotationRequestId_key" ON "ComboQuotationSnapshot"("quotationRequestId");
CREATE INDEX "ComboQuotationSnapshot_campaignId_createdAt_idx" ON "ComboQuotationSnapshot"("campaignId","createdAt");
CREATE INDEX "ComboCampaignEvent_campaignId_type_createdAt_idx" ON "ComboCampaignEvent"("campaignId","type","createdAt");
CREATE INDEX "ComboCampaignEvent_type_createdAt_idx" ON "ComboCampaignEvent"("type","createdAt");
ALTER TABLE "ComboCampaignItem" ADD CONSTRAINT "ComboCampaignItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ComboCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComboCampaignItem" ADD CONSTRAINT "ComboCampaignItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComboQuotationSnapshot" ADD CONSTRAINT "ComboQuotationSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ComboCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComboQuotationSnapshot" ADD CONSTRAINT "ComboQuotationSnapshot_quotationRequestId_fkey" FOREIGN KEY ("quotationRequestId") REFERENCES "QuotationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComboCampaignEvent" ADD CONSTRAINT "ComboCampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ComboCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
