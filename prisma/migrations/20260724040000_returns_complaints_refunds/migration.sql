-- CreateEnum
CREATE TYPE "ReturnCaseSource" AS ENUM ('CUSTOMER_PORTAL', 'ADMIN_MANUAL', 'EMAIL', 'WHATSAPP', 'TELEPHONE', 'IMPORTED', 'API');

-- CreateEnum
CREATE TYPE "ReturnCaseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'INFORMATION_REQUIRED', 'AWAITING_ASSESSMENT', 'ASSESSMENT_IN_PROGRESS', 'DECISION_PENDING', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReturnAssessmentStatus" AS ENUM ('NOT_REQUIRED', 'AWAITING_ASSIGNMENT', 'ASSIGNED', 'APPOINTMENT_SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'FURTHER_TESTING_REQUIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReturnResolutionType" AS ENUM ('PENDING', 'GUIDANCE', 'REPAIR', 'REPLACEMENT', 'EXCHANGE', 'FULL_REFUND', 'PARTIAL_REFUND', 'STORE_CREDIT', 'REJECTED', 'RETURN_TO_CUSTOMER', 'ESCALATE_TO_DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "ReturnResolutionStatus" AS ENUM ('PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReturnRefundStatus" AS ENUM ('NOT_REQUIRED', 'AWAITING_APPROVAL', 'APPROVED', 'AWAITING_PAYMENT', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DistributorClaimStatus" AS ENUM ('NOT_REQUIRED', 'DRAFT', 'READY_TO_SUBMIT', 'SUBMITTED', 'AWAITING_RESPONSE', 'MORE_INFORMATION_REQUIRED', 'RETURN_AUTHORISED', 'PRODUCT_SENT', 'UNDER_ASSESSMENT', 'APPROVED', 'PARTIALLY_APPROVED', 'DECLINED', 'CREDIT_NOTE_RECEIVED', 'REFUND_RECEIVED', 'REPLACEMENT_RECEIVED', 'REPAIR_COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReturnedInventoryCondition" AS ENUM ('AWAITING_ASSESSMENT', 'NEW_UNOPENED', 'OPEN_BOX', 'CUSTOMER_RETURN', 'TESTED_WORKING', 'REFURBISHED', 'REPAIRED', 'USED', 'COSMETIC_DAMAGE', 'FUNCTIONAL_DAMAGE', 'PARTIALLY_WORKING', 'NON_FUNCTIONAL', 'SPARE_PARTS', 'SCRAP');

-- CreateEnum
CREATE TYPE "ReturnedInventoryOutcome" AS ENUM ('PENDING', 'RETURN_TO_CUSTOMER', 'RETURN_TO_DISTRIBUTOR', 'REPAIR', 'REPLACEMENT_RECEIVED', 'OPEN_BOX', 'REFURBISHED', 'USED', 'DAMAGED_STOCK', 'SPARE_PARTS', 'WRITE_OFF', 'DISPOSED', 'RESALE');

-- CreateEnum
CREATE TYPE "ReturnedUnitStatus" AS ENUM ('AWAITING_CONDITION_REVIEW', 'CONDITION_CONFIRMED', 'RESALE_APPROVED', 'LISTING_PREPARED', 'LISTING_REVIEWED', 'PUBLISHED', 'RESERVED', 'SOLD', 'WRITTEN_OFF', 'DISPOSED');

ALTER TABLE "Product"
ADD COLUMN "conditionLabel" TEXT,
ADD COLUMN "conditionDisclosure" TEXT,
ADD COLUMN "functionalStatus" TEXT,
ADD COLUMN "includedAccessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "missingAccessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "isReturnedResale" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ComplaintReason" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresInspection" BOOLEAN NOT NULL DEFAULT true,
    "requiresProductPhoto" BOOLEAN NOT NULL DEFAULT true,
    "requiresSerialPhoto" BOOLEAN NOT NULL DEFAULT false,
    "requiresPackagingPhoto" BOOLEAN NOT NULL DEFAULT false,
    "standardWindowDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplaintReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnPolicyVersion" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "standardReturnDays" INTEGER NOT NULL DEFAULT 7,
    "deliveryDamageDays" INTEGER NOT NULL DEFAULT 2,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnCase" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "customerId" UUID,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "productId" UUID,
    "reasonId" UUID NOT NULL,
    "policyVersionId" UUID,
    "createdById" UUID,
    "assignedReviewerId" UUID,
    "assignedTechnicianId" UUID,
    "source" "ReturnCaseSource" NOT NULL,
    "status" "ReturnCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "assessmentStatus" "ReturnAssessmentStatus" NOT NULL DEFAULT 'AWAITING_ASSIGNMENT',
    "resolutionType" "ReturnResolutionType" NOT NULL DEFAULT 'PENDING',
    "resolutionStatus" "ReturnResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "refundStatus" "ReturnRefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "distributorClaimStatus" "DistributorClaimStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "inventoryOutcome" "ReturnedInventoryOutcome" NOT NULL DEFAULT 'PENDING',
    "quantityAffected" INTEGER NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "unitPriceSnapshot" DECIMAL(19,4) NOT NULL,
    "warrantySnapshot" TEXT,
    "serialNumber" TEXT,
    "customerDescription" TEXT NOT NULL,
    "problemStartedAt" TIMESTAMP(3),
    "usageDescription" TEXT,
    "troubleshooting" TEXT,
    "preferredResolution" "ReturnResolutionType" NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "customerNote" TEXT,
    "internalNote" TEXT,
    "suspectedMisuse" BOOLEAN NOT NULL DEFAULT false,
    "suspectedDeliveryDamage" BOOLEAN NOT NULL DEFAULT false,
    "suspectedManufacturingDefect" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnEvidence" (
    "id" UUID NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "inspectionId" UUID,
    "documentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedById" UUID,
    "customerVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnInspection" (
    "id" UUID NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "technicianId" UUID,
    "status" "ReturnAssessmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "appointmentAt" TIMESTAMP(3),
    "expectedCompletionAt" TIMESTAMP(3),
    "location" TEXT,
    "instructions" TEXT,
    "serialNumberConfirmed" TEXT,
    "barcode" TEXT,
    "checklist" JSONB,
    "testResults" TEXT,
    "finding" TEXT,
    "findingExplanation" TEXT,
    "recommendation" "ReturnResolutionType",
    "technicianCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnResolution" (
    "id" UUID NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "inspectionId" UUID,
    "decidedById" UUID NOT NULL,
    "type" "ReturnResolutionType" NOT NULL,
    "status" "ReturnResolutionStatus" NOT NULL DEFAULT 'APPROVED',
    "customerExplanation" TEXT NOT NULL,
    "internalExplanation" TEXT,
    "rejectionReason" TEXT,
    "approvedAmount" DECIMAL(19,4),
    "deductionAmount" DECIMAL(19,4),
    "deductionReason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnResolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRefund" (
    "id" UUID NOT NULL,
    "refundNumber" TEXT NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "resolutionId" UUID NOT NULL,
    "originalPaymentId" UUID,
    "approvedById" UUID NOT NULL,
    "status" "ReturnRefundStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "originalAmount" DECIMAL(19,4) NOT NULL,
    "refundableAmount" DECIMAL(19,4) NOT NULL,
    "approvedAmount" DECIMAL(19,4) NOT NULL,
    "deductions" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "deductionReason" TEXT,
    "method" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRefundPayment" (
    "id" UUID NOT NULL,
    "refundId" UUID NOT NULL,
    "processedById" UUID NOT NULL,
    "proofDocumentId" UUID,
    "amount" DECIMAL(19,4) NOT NULL,
    "method" TEXT NOT NULL,
    "bankReference" TEXT,
    "transactionReference" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnRefundPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorClaim" (
    "id" UUID NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "supplierId" UUID,
    "status" "DistributorClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierReference" TEXT,
    "productName" TEXT NOT NULL,
    "productCode" TEXT,
    "serialNumber" TEXT,
    "faultDescription" TEXT NOT NULL,
    "technicianFinding" TEXT,
    "requestedResolution" TEXT NOT NULL,
    "claimAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "receivedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "creditNoteNumber" TEXT,
    "responseNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "followUpAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributorClaimDocument" (
    "id" UUID NOT NULL,
    "distributorClaimId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributorClaimDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnedInventoryUnit" (
    "id" UUID NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "originalProductId" UUID,
    "resaleProductId" UUID,
    "serialNumber" TEXT,
    "condition" "ReturnedInventoryCondition" NOT NULL DEFAULT 'AWAITING_ASSESSMENT',
    "outcome" "ReturnedInventoryOutcome" NOT NULL DEFAULT 'PENDING',
    "status" "ReturnedUnitStatus" NOT NULL DEFAULT 'AWAITING_CONDITION_REVIEW',
    "receivedAt" TIMESTAMP(3),
    "returnMethod" TEXT,
    "receivedBy" TEXT,
    "conditionNotes" TEXT,
    "packagingCondition" TEXT,
    "accessories" TEXT[],
    "storageLocation" TEXT,
    "repairHistory" TEXT,
    "damageDescription" TEXT,
    "costValue" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "repairCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "recoveryTarget" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "approvedResalePrice" DECIMAL(19,4),
    "resaleRecovery" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnedInventoryUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnCaseEvent" (
    "id" UUID NOT NULL,
    "returnCaseId" UUID NOT NULL,
    "actorId" UUID,
    "type" TEXT NOT NULL,
    "customerVisible" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintReason_name_key" ON "ComplaintReason"("name");

-- CreateIndex
CREATE INDEX "ComplaintReason_isActive_displayOrder_idx" ON "ComplaintReason"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnPolicyVersion_version_key" ON "ReturnPolicyVersion"("version");

-- CreateIndex
CREATE INDEX "ReturnPolicyVersion_isCurrent_effectiveAt_idx" ON "ReturnPolicyVersion"("isCurrent", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnCase_referenceNumber_key" ON "ReturnCase"("referenceNumber");

-- CreateIndex
CREATE INDEX "ReturnCase_customerId_createdAt_idx" ON "ReturnCase"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnCase_status_priority_createdAt_idx" ON "ReturnCase"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnCase_assignedTechnicianId_assessmentStatus_idx" ON "ReturnCase"("assignedTechnicianId", "assessmentStatus");

-- CreateIndex
CREATE INDEX "ReturnCase_orderId_orderItemId_idx" ON "ReturnCase"("orderId", "orderItemId");

-- CreateIndex
CREATE INDEX "ReturnCase_refundStatus_createdAt_idx" ON "ReturnCase"("refundStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnEvidence_documentId_key" ON "ReturnEvidence"("documentId");

-- CreateIndex
CREATE INDEX "ReturnEvidence_returnCaseId_type_idx" ON "ReturnEvidence"("returnCaseId", "type");

-- CreateIndex
CREATE INDEX "ReturnEvidence_inspectionId_idx" ON "ReturnEvidence"("inspectionId");

-- CreateIndex
CREATE INDEX "ReturnInspection_technicianId_status_appointmentAt_idx" ON "ReturnInspection"("technicianId", "status", "appointmentAt");

-- CreateIndex
CREATE INDEX "ReturnInspection_returnCaseId_createdAt_idx" ON "ReturnInspection"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnResolution_returnCaseId_decidedAt_idx" ON "ReturnResolution"("returnCaseId", "decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRefund_refundNumber_key" ON "ReturnRefund"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRefund_resolutionId_key" ON "ReturnRefund"("resolutionId");

-- CreateIndex
CREATE INDEX "ReturnRefund_status_createdAt_idx" ON "ReturnRefund"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnRefund_returnCaseId_idx" ON "ReturnRefund"("returnCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRefundPayment_proofDocumentId_key" ON "ReturnRefundPayment"("proofDocumentId");

-- CreateIndex
CREATE INDEX "ReturnRefundPayment_refundId_paidAt_idx" ON "ReturnRefundPayment"("refundId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorClaim_claimNumber_key" ON "DistributorClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "DistributorClaim_status_followUpAt_idx" ON "DistributorClaim"("status", "followUpAt");

-- CreateIndex
CREATE INDEX "DistributorClaim_supplierId_createdAt_idx" ON "DistributorClaim"("supplierId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorClaimDocument_documentId_key" ON "DistributorClaimDocument"("documentId");

-- CreateIndex
CREATE INDEX "DistributorClaimDocument_distributorClaimId_type_idx" ON "DistributorClaimDocument"("distributorClaimId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnedInventoryUnit_resaleProductId_key" ON "ReturnedInventoryUnit"("resaleProductId");

-- CreateIndex
CREATE INDEX "ReturnedInventoryUnit_status_condition_idx" ON "ReturnedInventoryUnit"("status", "condition");

-- CreateIndex
CREATE INDEX "ReturnedInventoryUnit_returnCaseId_idx" ON "ReturnedInventoryUnit"("returnCaseId");

-- CreateIndex
CREATE INDEX "ReturnCaseEvent_returnCaseId_createdAt_idx" ON "ReturnCaseEvent"("returnCaseId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "ComplaintReason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_policyVersionId_fkey" FOREIGN KEY ("policyVersionId") REFERENCES "ReturnPolicyVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCase" ADD CONSTRAINT "ReturnCase_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvidence" ADD CONSTRAINT "ReturnEvidence_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvidence" ADD CONSTRAINT "ReturnEvidence_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ReturnInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnEvidence" ADD CONSTRAINT "ReturnEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnInspection" ADD CONSTRAINT "ReturnInspection_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnInspection" ADD CONSTRAINT "ReturnInspection_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnResolution" ADD CONSTRAINT "ReturnResolution_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnResolution" ADD CONSTRAINT "ReturnResolution_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "ReturnInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnResolution" ADD CONSTRAINT "ReturnResolution_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefund" ADD CONSTRAINT "ReturnRefund_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefund" ADD CONSTRAINT "ReturnRefund_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "ReturnResolution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefund" ADD CONSTRAINT "ReturnRefund_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefund" ADD CONSTRAINT "ReturnRefund_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefundPayment" ADD CONSTRAINT "ReturnRefundPayment_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "ReturnRefund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefundPayment" ADD CONSTRAINT "ReturnRefundPayment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRefundPayment" ADD CONSTRAINT "ReturnRefundPayment_proofDocumentId_fkey" FOREIGN KEY ("proofDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorClaim" ADD CONSTRAINT "DistributorClaim_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorClaim" ADD CONSTRAINT "DistributorClaim_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorClaimDocument" ADD CONSTRAINT "DistributorClaimDocument_distributorClaimId_fkey" FOREIGN KEY ("distributorClaimId") REFERENCES "DistributorClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DistributorClaimDocument" ADD CONSTRAINT "DistributorClaimDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedInventoryUnit" ADD CONSTRAINT "ReturnedInventoryUnit_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedInventoryUnit" ADD CONSTRAINT "ReturnedInventoryUnit_originalProductId_fkey" FOREIGN KEY ("originalProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedInventoryUnit" ADD CONSTRAINT "ReturnedInventoryUnit_resaleProductId_fkey" FOREIGN KEY ("resaleProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id","key","createdAt","updatedAt")
SELECT gen_random_uuid(), key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM (VALUES
('returns.view'),('returns.create'),('returns.review'),('returns.request-information'),('returns.assign-technician'),
('returns.inspections.assigned'),('returns.inspections.perform'),('returns.inspections.review'),
('returns.repair.approve'),('returns.replacement.approve'),('returns.refund.approve'),('returns.reject'),
('returns.refund.pay'),('returns.refund.confirm'),('returns.claims.manage'),('returns.inventory.classify'),
('returns.resale.create'),('returns.resale.approve'),('returns.resale.publish'),('returns.policy.manage'),
('returns.reasons.manage'),('returns.financial.view'),('returns.documents.download'),('returns.documents.send')
) AS requested(key) ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Role" ("id","name","slug","description","isSystem","createdAt","updatedAt") VALUES
(gen_random_uuid(),'Returns Manager','returns-manager','Reviews complaints and approves customer resolutions without confirming refund payments',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Technician','technician','Performs only assigned product inspections',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r."id",p."id",'ALLOW',CURRENT_TIMESTAMP FROM "Role" r CROSS JOIN "Permission" p
WHERE r."slug"='super-administrator' AND p."key" LIKE 'returns.%'
ON CONFLICT ("roleId","permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r."id",p."id",'ALLOW',CURRENT_TIMESTAMP FROM "Role" r CROSS JOIN "Permission" p
WHERE r."slug"='returns-manager' AND p."key" IN
('returns.view','returns.create','returns.review','returns.request-information','returns.assign-technician','returns.inspections.review','returns.repair.approve','returns.replacement.approve','returns.refund.approve','returns.reject','returns.claims.manage','returns.inventory.classify','returns.resale.create','returns.resale.approve','returns.policy.manage','returns.reasons.manage','returns.financial.view','returns.documents.download','returns.documents.send')
ON CONFLICT ("roleId","permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r."id",p."id",'ALLOW',CURRENT_TIMESTAMP FROM "Role" r CROSS JOIN "Permission" p
WHERE r."slug"='technician' AND p."key" IN ('returns.view','returns.inspections.assigned','returns.inspections.perform')
ON CONFLICT ("roleId","permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r."id",p."id",'ALLOW',CURRENT_TIMESTAMP FROM "Role" r CROSS JOIN "Permission" p
WHERE r."slug"='finance' AND p."key" IN ('returns.view','returns.refund.pay','returns.refund.confirm','returns.financial.view')
ON CONFLICT ("roleId","permissionId") DO NOTHING;

INSERT INTO "ComplaintReason" ("id","name","description","requiresInspection","requiresProductPhoto","requiresSerialPhoto","requiresPackagingPhoto","standardWindowDays","displayOrder","createdAt","updatedAt") VALUES
(gen_random_uuid(),'Product arrived damaged','Damage identified at or immediately after delivery',true,true,true,true,2,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Product stopped working','Product previously worked and no longer performs its function',true,true,true,false,NULL,20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Product does not switch on','Product cannot be powered on',true,true,true,false,NULL,30,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Missing components','Required components or accessories were not supplied',true,true,false,true,7,40,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Incorrect product delivered','Delivered item differs from the agreed order',true,true,true,true,7,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Incorrect quantity delivered','Delivered quantity differs from the order',false,true,false,true,7,60,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Product is not as described','Product materially differs from the documented description',true,true,false,false,7,70,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Product is incompatible','Compatibility assistance or assessment is required',true,false,false,false,7,80,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Customer changed their mind','Request requires policy and condition review',true,true,false,true,7,90,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Suspected manufacturing defect','Possible supplier or manufacturer defect',true,true,true,false,NULL,100,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Warranty claim','Request requires warranty and technical assessment',true,true,true,false,NULL,110,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
(gen_random_uuid(),'Other','Another product concern requiring human review',true,true,false,false,NULL,999,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "ReturnPolicyVersion" ("id","version","title","content","standardReturnDays","deliveryDamageDays","effectiveAt","publishedAt","isCurrent","createdAt","updatedAt")
VALUES (gen_random_uuid(),1,'Returns and product assistance policy','Contact Innozanzi if a delivered product is damaged, defective, incorrect or unsuitable. Every request is reviewed against the order, product condition, warranty and applicable South African consumer law. Submission does not guarantee a refund. We may request evidence or arrange assessment before confirming repair, replacement, exchange, credit, refund or another fair resolution.',7,2,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("version") DO NOTHING;

-- AddForeignKey
ALTER TABLE "ReturnCaseEvent" ADD CONSTRAINT "ReturnCaseEvent_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnCaseEvent" ADD CONSTRAINT "ReturnCaseEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
