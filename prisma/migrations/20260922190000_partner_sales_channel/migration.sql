CREATE TYPE "PartnerSalesProfileStatus" AS ENUM ('INVITED', 'PROFILE_INCOMPLETE', 'ADMIN_REVIEW', 'ACTIVE', 'CHANGES_REQUIRED', 'SUSPENDED', 'CLOSED');
CREATE TYPE "PartnerCommissionMethod" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "PartnerCatalogueSourceType" AS ENUM ('PRODUCT', 'SUPPLIER_CATALOGUE_PRODUCT', 'COMBO', 'CAMPAIGN');
CREATE TYPE "PartnerCatalogueAssignmentStatus" AS ENUM ('ACTIVE', 'WITHDRAWN');
CREATE TYPE "PartnerShowcaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'REVOKED');
CREATE TYPE "PartnerShowcaseVisibility" AS ENUM ('PUBLIC', 'CLIENT_SPECIFIC');
CREATE TYPE "PartnerQuoteCaseStatus" AS ENUM ('NEW_ENQUIRY', 'QUALIFIED', 'PRICING_REQUESTED', 'INNOZANZI_REVIEW', 'PARTNER_REVIEW', 'SENT_TO_CLIENT', 'ACCEPTED', 'PAYMENT_PENDING', 'PAID', 'ORDER_IN_PROGRESS', 'COMPLETED', 'REVISION_REQUESTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "PartnerCommissionStatus" AS ENUM ('ESTIMATED', 'LOCKED_ON_PAYMENT', 'PENDING_COMPLETION', 'PAYABLE', 'HELD', 'ADJUSTED', 'REVERSED', 'INCLUDED_IN_BATCH', 'PAID');
CREATE TYPE "PartnerCommissionEntryType" AS ENUM ('ESTIMATE', 'LOCK', 'HOLD', 'RELEASE', 'ADJUSTMENT', 'REVERSAL', 'BATCHED', 'PAYMENT', 'CORRECTION');
CREATE TYPE "PartnerPayoutBatchStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "PartnerPayoutItemStatus" AS ENUM ('ACTIVE', 'CANCELLED');

ALTER TABLE "QuotationRequest" ADD COLUMN "partnerQuoteCaseId" UUID;
ALTER TABLE "QuotationRequest" ADD COLUMN "partnerSalesProfileId" UUID;
ALTER TABLE "Quotation" ADD COLUMN "partnerQuoteCaseId" UUID;
ALTER TABLE "Quotation" ADD COLUMN "partnerSalesProfileId" UUID;
ALTER TABLE "Order" ADD COLUMN "partnerQuoteCaseId" UUID;
ALTER TABLE "Payment" ADD COLUMN "partnerQuoteCaseId" UUID;

CREATE TABLE "PartnerSalesProfile" (
  "id" UUID NOT NULL,
  "partnershipId" UUID NOT NULL,
  "publicSlug" TEXT NOT NULL,
  "status" "PartnerSalesProfileStatus" NOT NULL DEFAULT 'INVITED',
  "displayName" TEXT NOT NULL,
  "legalName" TEXT,
  "registrationNumber" TEXT,
  "vatNumber" TEXT,
  "logoDocumentId" UUID,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "footerText" TEXT,
  "themePreset" TEXT NOT NULL DEFAULT 'DEFAULT',
  "defaultCommissionMethod" "PartnerCommissionMethod" NOT NULL,
  "defaultCommissionValue" DECIMAL(19,4) NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "approvedById" UUID,
  "publicCatalogueEnabled" BOOLEAN NOT NULL DEFAULT false,
  "suspendedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerSalesProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerCatalogueAssignment" (
  "id" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "sourceType" "PartnerCatalogueSourceType" NOT NULL,
  "sourceId" UUID NOT NULL,
  "status" "PartnerCatalogueAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "visibleFrom" TIMESTAMP(3),
  "visibleUntil" TIMESTAMP(3),
  "presentationTitle" TEXT,
  "presentationCopy" TEXT,
  "mediaSnapshot" JSONB,
  "availabilityFingerprint" TEXT NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "withdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerCatalogueAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerClient" (
  "id" UUID NOT NULL,
  "partnershipId" UUID NOT NULL,
  "companyName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "vatNumber" TEXT,
  "registrationNumber" TEXT,
  "billingAddress" JSONB,
  "deliveryAddress" JSONB,
  "communicationConsent" BOOLEAN NOT NULL DEFAULT false,
  "consentAt" TIMESTAMP(3),
  "source" TEXT NOT NULL,
  "partnerNotes" TEXT,
  "internalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerClient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerShowcase" (
  "id" UUID NOT NULL,
  "publicId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "clientId" UUID,
  "createdById" UUID,
  "title" TEXT NOT NULL,
  "introduction" TEXT,
  "status" "PartnerShowcaseStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "PartnerShowcaseVisibility" NOT NULL DEFAULT 'PUBLIC',
  "accessTokenHash" TEXT,
  "activatedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerShowcase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerShowcaseItem" (
  "id" UUID NOT NULL,
  "showcaseId" UUID NOT NULL,
  "catalogueAssignmentId" UUID,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "sourceType" "PartnerCatalogueSourceType" NOT NULL,
  "sourceId" UUID NOT NULL,
  "titleSnapshot" TEXT NOT NULL,
  "mediaSnapshot" JSONB,
  "presentationCopySnapshot" TEXT,
  "availabilityFingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerShowcaseItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerQuoteCase" (
  "id" UUID NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "partnershipId" UUID NOT NULL,
  "profileId" UUID NOT NULL,
  "partnerClientId" UUID NOT NULL,
  "originatingShowcaseId" UUID,
  "assignedPartnerUserId" UUID,
  "innozanziOwnerId" UUID,
  "status" "PartnerQuoteCaseStatus" NOT NULL DEFAULT 'NEW_ENQUIRY',
  "activeQuotationId" UUID,
  "acceptedQuotationId" UUID,
  "acceptedQuotationVersionId" UUID,
  "clientVisibleNotes" TEXT,
  "partnerNotes" TEXT,
  "internalNotes" TEXT,
  "enquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "qualifiedAt" TIMESTAMP(3),
  "pricingRequestedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lostAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerQuoteCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerCommission" (
  "id" UUID NOT NULL,
  "partnershipId" UUID NOT NULL,
  "caseId" UUID NOT NULL,
  "quotationId" UUID NOT NULL,
  "quotationVersionId" UUID NOT NULL,
  "orderId" UUID,
  "method" "PartnerCommissionMethod" NOT NULL,
  "approvedBasis" DECIMAL(19,4) NOT NULL,
  "approvedValue" DECIMAL(19,4) NOT NULL,
  "quotedAmount" DECIMAL(19,4) NOT NULL,
  "currentAmount" DECIMAL(19,4) NOT NULL,
  "heldAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "adjustedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "reversedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL DEFAULT 'ZAR',
  "status" "PartnerCommissionStatus" NOT NULL DEFAULT 'ESTIMATED',
  "calculationSnapshot" JSONB NOT NULL,
  "eligibilityAt" TIMESTAMP(3),
  "reconciledAt" TIMESTAMP(3),
  "payableAt" TIMESTAMP(3),
  "heldAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "adjustmentReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerCommission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerCommissionEntry" (
  "id" UUID NOT NULL,
  "commissionId" UUID NOT NULL,
  "type" "PartnerCommissionEntryType" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "balanceAfter" DECIMAL(19,4) NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "actorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerCommissionEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerPayoutBatch" (
  "id" UUID NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "partnershipId" UUID NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "PartnerPayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "total" DECIMAL(19,4) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'ZAR',
  "paymentReference" TEXT,
  "paymentDate" TIMESTAMP(3),
  "proofDocumentId" UUID,
  "statementDocumentId" UUID,
  "preparedById" UUID NOT NULL,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "exceptionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerPayoutBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartnerPayoutItem" (
  "id" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "commissionId" UUID NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "status" "PartnerPayoutItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "cancelledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPayoutItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerSalesProfile_partnershipId_key" ON "PartnerSalesProfile"("partnershipId");
CREATE UNIQUE INDEX "PartnerSalesProfile_publicSlug_key" ON "PartnerSalesProfile"("publicSlug");
CREATE UNIQUE INDEX "PartnerSalesProfile_logoDocumentId_key" ON "PartnerSalesProfile"("logoDocumentId");
CREATE INDEX "PartnerSalesProfile_status_publicCatalogueEnabled_idx" ON "PartnerSalesProfile"("status", "publicCatalogueEnabled");
CREATE INDEX "PartnerSalesProfile_approvedById_approvedAt_idx" ON "PartnerSalesProfile"("approvedById", "approvedAt");

CREATE UNIQUE INDEX "PartnerCatalogueAssignment_profileId_sourceType_sourceId_key" ON "PartnerCatalogueAssignment"("profileId", "sourceType", "sourceId");
CREATE INDEX "PartnerCatalogueAssignment_profileId_status_visibleFrom_vis_idx" ON "PartnerCatalogueAssignment"("profileId", "status", "visibleFrom", "visibleUntil");
CREATE INDEX "PartnerCatalogueAssignment_status_visibleUntil_idx" ON "PartnerCatalogueAssignment"("status", "visibleUntil");
CREATE INDEX "PartnerCatalogueAssignment_approvedById_approvedAt_idx" ON "PartnerCatalogueAssignment"("approvedById", "approvedAt");

CREATE UNIQUE INDEX "PartnerClient_partnershipId_email_key" ON "PartnerClient"("partnershipId", "email");
CREATE INDEX "PartnerClient_partnershipId_updatedAt_idx" ON "PartnerClient"("partnershipId", "updatedAt");
CREATE INDEX "PartnerClient_partnershipId_companyName_idx" ON "PartnerClient"("partnershipId", "companyName");

CREATE UNIQUE INDEX "PartnerShowcase_publicId_key" ON "PartnerShowcase"("publicId");
CREATE UNIQUE INDEX "PartnerShowcase_accessTokenHash_key" ON "PartnerShowcase"("accessTokenHash");
CREATE INDEX "PartnerShowcase_profileId_status_updatedAt_idx" ON "PartnerShowcase"("profileId", "status", "updatedAt");
CREATE INDEX "PartnerShowcase_clientId_status_idx" ON "PartnerShowcase"("clientId", "status");
CREATE INDEX "PartnerShowcase_status_expiresAt_idx" ON "PartnerShowcase"("status", "expiresAt");
CREATE INDEX "PartnerShowcase_createdById_updatedAt_idx" ON "PartnerShowcase"("createdById", "updatedAt");

CREATE UNIQUE INDEX "PartnerShowcaseItem_showcaseId_sourceType_sourceId_key" ON "PartnerShowcaseItem"("showcaseId", "sourceType", "sourceId");
CREATE INDEX "PartnerShowcaseItem_showcaseId_sortOrder_idx" ON "PartnerShowcaseItem"("showcaseId", "sortOrder");
CREATE INDEX "PartnerShowcaseItem_catalogueAssignmentId_idx" ON "PartnerShowcaseItem"("catalogueAssignmentId");

CREATE UNIQUE INDEX "PartnerQuoteCase_caseNumber_key" ON "PartnerQuoteCase"("caseNumber");
CREATE UNIQUE INDEX "PartnerQuoteCase_activeQuotationId_key" ON "PartnerQuoteCase"("activeQuotationId");
CREATE UNIQUE INDEX "PartnerQuoteCase_acceptedQuotationId_key" ON "PartnerQuoteCase"("acceptedQuotationId");
CREATE UNIQUE INDEX "PartnerQuoteCase_acceptedQuotationVersionId_key" ON "PartnerQuoteCase"("acceptedQuotationVersionId");
CREATE INDEX "PartnerQuoteCase_partnershipId_status_updatedAt_idx" ON "PartnerQuoteCase"("partnershipId", "status", "updatedAt");
CREATE INDEX "PartnerQuoteCase_profileId_status_updatedAt_idx" ON "PartnerQuoteCase"("profileId", "status", "updatedAt");
CREATE INDEX "PartnerQuoteCase_partnerClientId_createdAt_idx" ON "PartnerQuoteCase"("partnerClientId", "createdAt");
CREATE INDEX "PartnerQuoteCase_assignedPartnerUserId_status_idx" ON "PartnerQuoteCase"("assignedPartnerUserId", "status");
CREATE INDEX "PartnerQuoteCase_innozanziOwnerId_status_idx" ON "PartnerQuoteCase"("innozanziOwnerId", "status");
CREATE INDEX "PartnerQuoteCase_status_createdAt_idx" ON "PartnerQuoteCase"("status", "createdAt");

CREATE UNIQUE INDEX "PartnerCommission_caseId_key" ON "PartnerCommission"("caseId");
CREATE UNIQUE INDEX "PartnerCommission_orderId_key" ON "PartnerCommission"("orderId");
CREATE INDEX "PartnerCommission_partnershipId_status_updatedAt_idx" ON "PartnerCommission"("partnershipId", "status", "updatedAt");
CREATE INDEX "PartnerCommission_status_eligibilityAt_idx" ON "PartnerCommission"("status", "eligibilityAt");
CREATE INDEX "PartnerCommission_quotationId_quotationVersionId_idx" ON "PartnerCommission"("quotationId", "quotationVersionId");

CREATE INDEX "PartnerCommissionEntry_commissionId_createdAt_idx" ON "PartnerCommissionEntry"("commissionId", "createdAt");
CREATE INDEX "PartnerCommissionEntry_type_createdAt_idx" ON "PartnerCommissionEntry"("type", "createdAt");
CREATE INDEX "PartnerCommissionEntry_actorId_createdAt_idx" ON "PartnerCommissionEntry"("actorId", "createdAt");

CREATE UNIQUE INDEX "PartnerPayoutBatch_batchNumber_key" ON "PartnerPayoutBatch"("batchNumber");
CREATE UNIQUE INDEX "PartnerPayoutBatch_proofDocumentId_key" ON "PartnerPayoutBatch"("proofDocumentId");
CREATE UNIQUE INDEX "PartnerPayoutBatch_statementDocumentId_key" ON "PartnerPayoutBatch"("statementDocumentId");
CREATE INDEX "PartnerPayoutBatch_partnershipId_status_periodStart_periodE_idx" ON "PartnerPayoutBatch"("partnershipId", "status", "periodStart", "periodEnd");
CREATE INDEX "PartnerPayoutBatch_status_periodEnd_idx" ON "PartnerPayoutBatch"("status", "periodEnd");
CREATE INDEX "PartnerPayoutBatch_preparedById_createdAt_idx" ON "PartnerPayoutBatch"("preparedById", "createdAt");
CREATE INDEX "PartnerPayoutBatch_approvedById_approvedAt_idx" ON "PartnerPayoutBatch"("approvedById", "approvedAt");

CREATE UNIQUE INDEX "PartnerPayoutItem_batchId_commissionId_key" ON "PartnerPayoutItem"("batchId", "commissionId");
CREATE UNIQUE INDEX "PartnerPayoutItem_active_commission_key" ON "PartnerPayoutItem"("commissionId") WHERE "cancelledAt" IS NULL;
CREATE INDEX "PartnerPayoutItem_batchId_status_idx" ON "PartnerPayoutItem"("batchId", "status");
CREATE INDEX "PartnerPayoutItem_commissionId_status_idx" ON "PartnerPayoutItem"("commissionId", "status");

CREATE UNIQUE INDEX "QuotationRequest_partnerQuoteCaseId_key" ON "QuotationRequest"("partnerQuoteCaseId");
CREATE INDEX "QuotationRequest_partnerSalesProfileId_status_createdAt_idx" ON "QuotationRequest"("partnerSalesProfileId", "status", "createdAt");
CREATE INDEX "Quotation_partnerQuoteCaseId_status_createdAt_idx" ON "Quotation"("partnerQuoteCaseId", "status", "createdAt");
CREATE INDEX "Quotation_partnerSalesProfileId_status_createdAt_idx" ON "Quotation"("partnerSalesProfileId", "status", "createdAt");
CREATE UNIQUE INDEX "Order_partnerQuoteCaseId_key" ON "Order"("partnerQuoteCaseId");
CREATE INDEX "Order_partnerQuoteCaseId_createdAt_idx" ON "Order"("partnerQuoteCaseId", "createdAt");
CREATE INDEX "Payment_partnerQuoteCaseId_status_idx" ON "Payment"("partnerQuoteCaseId", "status");

ALTER TABLE "PartnerSalesProfile" ADD CONSTRAINT "PartnerSalesProfile_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerSalesProfile" ADD CONSTRAINT "PartnerSalesProfile_logoDocumentId_fkey" FOREIGN KEY ("logoDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerSalesProfile" ADD CONSTRAINT "PartnerSalesProfile_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerCatalogueAssignment" ADD CONSTRAINT "PartnerCatalogueAssignment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PartnerSalesProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerCatalogueAssignment" ADD CONSTRAINT "PartnerCatalogueAssignment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerClient" ADD CONSTRAINT "PartnerClient_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PartnerShowcase" ADD CONSTRAINT "PartnerShowcase_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PartnerSalesProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerShowcase" ADD CONSTRAINT "PartnerShowcase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "PartnerClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerShowcase" ADD CONSTRAINT "PartnerShowcase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerShowcaseItem" ADD CONSTRAINT "PartnerShowcaseItem_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "PartnerShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerShowcaseItem" ADD CONSTRAINT "PartnerShowcaseItem_catalogueAssignmentId_fkey" FOREIGN KEY ("catalogueAssignmentId") REFERENCES "PartnerCatalogueAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "PartnerSalesProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_partnerClientId_fkey" FOREIGN KEY ("partnerClientId") REFERENCES "PartnerClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_originatingShowcaseId_fkey" FOREIGN KEY ("originatingShowcaseId") REFERENCES "PartnerShowcase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_assignedPartnerUserId_fkey" FOREIGN KEY ("assignedPartnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_innozanziOwnerId_fkey" FOREIGN KEY ("innozanziOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_activeQuotationId_fkey" FOREIGN KEY ("activeQuotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_acceptedQuotationId_fkey" FOREIGN KEY ("acceptedQuotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerQuoteCase" ADD CONSTRAINT "PartnerQuoteCase_acceptedQuotationVersionId_fkey" FOREIGN KEY ("acceptedQuotationVersionId") REFERENCES "QuotationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PartnerQuoteCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_quotationVersionId_fkey" FOREIGN KEY ("quotationVersionId") REFERENCES "QuotationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerCommissionEntry" ADD CONSTRAINT "PartnerCommissionEntry_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "PartnerCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerCommissionEntry" ADD CONSTRAINT "PartnerCommissionEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerPayoutBatch" ADD CONSTRAINT "PartnerPayoutBatch_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerPayoutBatch" ADD CONSTRAINT "PartnerPayoutBatch_proofDocumentId_fkey" FOREIGN KEY ("proofDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerPayoutBatch" ADD CONSTRAINT "PartnerPayoutBatch_statementDocumentId_fkey" FOREIGN KEY ("statementDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnerPayoutBatch" ADD CONSTRAINT "PartnerPayoutBatch_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerPayoutBatch" ADD CONSTRAINT "PartnerPayoutBatch_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartnerPayoutItem" ADD CONSTRAINT "PartnerPayoutItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PartnerPayoutBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnerPayoutItem" ADD CONSTRAINT "PartnerPayoutItem_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "PartnerCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuotationRequest" ADD CONSTRAINT "QuotationRequest_partnerQuoteCaseId_fkey" FOREIGN KEY ("partnerQuoteCaseId") REFERENCES "PartnerQuoteCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuotationRequest" ADD CONSTRAINT "QuotationRequest_partnerSalesProfileId_fkey" FOREIGN KEY ("partnerSalesProfileId") REFERENCES "PartnerSalesProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_partnerQuoteCaseId_fkey" FOREIGN KEY ("partnerQuoteCaseId") REFERENCES "PartnerQuoteCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_partnerSalesProfileId_fkey" FOREIGN KEY ("partnerSalesProfileId") REFERENCES "PartnerSalesProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_partnerQuoteCaseId_fkey" FOREIGN KEY ("partnerQuoteCaseId") REFERENCES "PartnerQuoteCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_partnerQuoteCaseId_fkey" FOREIGN KEY ("partnerQuoteCaseId") REFERENCES "PartnerQuoteCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
