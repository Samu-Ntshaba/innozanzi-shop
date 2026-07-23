ALTER TYPE "BusinessDocumentType" ADD VALUE 'RETURN_CASE';
ALTER TYPE "BusinessDocumentType" ADD VALUE 'INSPECTION_REPORT';
ALTER TYPE "BusinessDocumentType" ADD VALUE 'RESOLUTION_NOTICE';
ALTER TYPE "BusinessDocumentType" ADD VALUE 'CREDIT_NOTE';
ALTER TYPE "BusinessDocumentType" ADD VALUE 'REFUND_CONFIRMATION';

CREATE TYPE "ReturnRepairStatus" AS ENUM ('APPROVED','AWAITING_PRODUCT','DIAGNOSING','AWAITING_PARTS','REPAIR_IN_PROGRESS','QUALITY_CHECK','READY_FOR_RETURN','RETURNED_TO_CUSTOMER','COMPLETED','FAILED','CANCELLED');
CREATE TYPE "ReturnReplacementStatus" AS ENUM ('APPROVED','SOURCING','ALLOCATED','PACKING','READY_FOR_DELIVERY','DISPATCHED','DELIVERED','COMPLETED','FAILED','CANCELLED');

CREATE TABLE "ReturnRepair" (
  "id" UUID NOT NULL, "repairNumber" TEXT NOT NULL, "returnCaseId" UUID NOT NULL, "resolutionId" UUID NOT NULL,
  "status" "ReturnRepairStatus" NOT NULL DEFAULT 'APPROVED', "assignedToId" UUID, "completedById" UUID,
  "diagnosis" TEXT, "workPerformed" TEXT, "partsUsed" TEXT, "supplierReference" TEXT,
  "estimatedCost" DECIMAL(19,4) NOT NULL DEFAULT 0, "actualCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "expectedCompletionAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "customerNote" TEXT, "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRepair_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReturnRepair_repairNumber_key" ON "ReturnRepair"("repairNumber");
CREATE UNIQUE INDEX "ReturnRepair_resolutionId_key" ON "ReturnRepair"("resolutionId");
CREATE INDEX "ReturnRepair_status_expectedCompletionAt_idx" ON "ReturnRepair"("status","expectedCompletionAt");
CREATE INDEX "ReturnRepair_returnCaseId_createdAt_idx" ON "ReturnRepair"("returnCaseId","createdAt");

CREATE TABLE "ReturnReplacement" (
  "id" UUID NOT NULL, "replacementNumber" TEXT NOT NULL, "returnCaseId" UUID NOT NULL, "resolutionId" UUID NOT NULL,
  "status" "ReturnReplacementStatus" NOT NULL DEFAULT 'APPROVED', "assignedToId" UUID, "completedById" UUID,
  "replacementProductId" UUID, "productNameSnapshot" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  "serialNumbers" TEXT[] NOT NULL, "supplierReference" TEXT, "deliveryReference" TEXT,
  "expectedDeliveryAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "customerNote" TEXT, "internalNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ReturnReplacement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReturnReplacement_replacementNumber_key" ON "ReturnReplacement"("replacementNumber");
CREATE UNIQUE INDEX "ReturnReplacement_resolutionId_key" ON "ReturnReplacement"("resolutionId");
CREATE INDEX "ReturnReplacement_status_expectedDeliveryAt_idx" ON "ReturnReplacement"("status","expectedDeliveryAt");
CREATE INDEX "ReturnReplacement_returnCaseId_createdAt_idx" ON "ReturnReplacement"("returnCaseId","createdAt");

ALTER TABLE "ReturnRepair" ADD CONSTRAINT "ReturnRepair_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRepair" ADD CONSTRAINT "ReturnRepair_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "ReturnResolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnRepair" ADD CONSTRAINT "ReturnRepair_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnRepair" ADD CONSTRAINT "ReturnRepair_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnReplacement" ADD CONSTRAINT "ReturnReplacement_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnReplacement" ADD CONSTRAINT "ReturnReplacement_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "ReturnResolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnReplacement" ADD CONSTRAINT "ReturnReplacement_replacementProductId_fkey" FOREIGN KEY ("replacementProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnReplacement" ADD CONSTRAINT "ReturnReplacement_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnReplacement" ADD CONSTRAINT "ReturnReplacement_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
