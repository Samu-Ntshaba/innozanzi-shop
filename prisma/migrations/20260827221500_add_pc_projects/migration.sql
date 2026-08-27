CREATE TYPE "PcProjectStatus" AS ENUM ('PLANNING', 'READY_TO_BUILD', 'IN_PROGRESS', 'COMPLETE');

CREATE TABLE "PcProject" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "buildType" TEXT NOT NULL DEFAULT 'PC_ONLY',
  "status" "PcProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "aiAnalysis" JSONB,
  "analysisFingerprint" TEXT,
  "lastReminderAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PcProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PcProjectItem" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "stepKey" TEXT NOT NULL,
  "supplierProductId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "image" TEXT,
  "specifications" JSONB,
  "configuredPrice" DECIMAL(19,4) NOT NULL,
  "purchasedPrice" DECIMAL(19,4),
  "purchasedAt" TIMESTAMP(3),
  "orderId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PcProjectItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cart" ADD COLUMN "pcProjectId" UUID;
ALTER TABLE "Order" ADD COLUMN "pcProjectId" UUID;
CREATE INDEX "PcProject_userId_status_updatedAt_idx" ON "PcProject"("userId", "status", "updatedAt");
CREATE UNIQUE INDEX "PcProjectItem_projectId_stepKey_key" ON "PcProjectItem"("projectId", "stepKey");
CREATE INDEX "PcProjectItem_supplierProductId_idx" ON "PcProjectItem"("supplierProductId");
CREATE INDEX "PcProjectItem_orderId_idx" ON "PcProjectItem"("orderId");
ALTER TABLE "PcProject" ADD CONSTRAINT "PcProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PcProjectItem" ADD CONSTRAINT "PcProjectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PcProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_pcProjectId_fkey" FOREIGN KEY ("pcProjectId") REFERENCES "PcProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_pcProjectId_fkey" FOREIGN KEY ("pcProjectId") REFERENCES "PcProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
