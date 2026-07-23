ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'INVITED' BEFORE 'PENDING_VERIFICATION';
CREATE TYPE "AccountType" AS ENUM ('INTERNAL_EMPLOYEE','CUSTOMER','SUPPLIER','EXTERNAL_COLLABORATOR');
CREATE TYPE "RfqType" AS ENUM ('RFQ','TENDER','RFP','RFI','OTHER');
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT','ANALYSING','ANALYSIS_FAILED','READY_FOR_REVIEW','UNDER_REVIEW','ACCEPTED_FOR_PROCESSING','DECLINED_INTERNAL','PRICING_IN_PROGRESS','AWAITING_APPROVAL','APPROVED','REJECTED','SUBMITTED','WON','LOST','CANCELLED','EXPIRED','COMPLETED');
CREATE TYPE "RfqSourceType" AS ENUM ('PDF','IMAGE','WORD','SPREADSHEET','WEBSITE','DOCUMENT_LINK','MANUAL');
CREATE TYPE "RfqProcessingStatus" AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED');
CREATE TYPE "RfqPricingMethod" AS ENUM ('MARKUP','MARGIN');
CREATE TYPE "RfqCostCategory" AS ENUM ('TRANSPORT','COURIER','DELIVERY','INSTALLATION','LABOUR','PACKAGING','INSURANCE','IMPORT_DUTIES','BANK_CHARGES','TENDER_FEES','SUBCONTRACTOR','CONTINGENCY','OTHER');
CREATE TYPE "RfqCommissionType" AS ENUM ('REVENUE_PERCENT','GROSS_PROFIT_PERCENT','FIXED');
CREATE TYPE "RfqDecision" AS ENUM ('PENDING','APPROVED','REJECTED');

ALTER TABLE "User"
  ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN "companyId" UUID,
  ADD COLUMN "departmentId" UUID,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "temporaryPasswordExpiresAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3);

CREATE TABLE "Department" (
  "id" UUID NOT NULL,
  "companyId" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_companyId_name_key" ON "Department"("companyId","name");
CREATE INDEX "Department_companyId_isActive_idx" ON "Department"("companyId","isActive");

CREATE TABLE "UserInvitation" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "invitedById" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "companyId" UUID,
  "departmentId" UUID,
  "accountType" "AccountType" NOT NULL,
  "activationTokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserInvitation_activationTokenHash_key" ON "UserInvitation"("activationTokenHash");
CREATE INDEX "UserInvitation_userId_expiresAt_idx" ON "UserInvitation"("userId","expiresAt");
CREATE INDEX "UserInvitation_invitedById_createdAt_idx" ON "UserInvitation"("invitedById","createdAt");
CREATE INDEX "User_companyId_status_idx" ON "User"("companyId","status");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

CREATE TABLE "RfqOpportunity" (
  "id" UUID NOT NULL, "referenceNumber" TEXT NOT NULL, "externalReference" TEXT,
  "type" "RfqType" NOT NULL, "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL, "description" TEXT, "issuingOrganisation" TEXT NOT NULL,
  "contactName" TEXT, "contactEmail" TEXT, "contactPhone" TEXT, "province" TEXT,
  "publicationDate" TIMESTAMP(3), "closingAt" TIMESTAMP(3), "briefingAt" TIMESTAMP(3),
  "compulsoryBriefing" BOOLEAN NOT NULL DEFAULT false, "submissionMethod" TEXT,
  "submissionAddress" TEXT, "sourceUrl" TEXT, "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "tags" TEXT[] NOT NULL, "notes" TEXT, "companyId" UUID, "departmentId" UUID,
  "assignedUserId" UUID, "createdById" UUID NOT NULL, "currency" CHAR(3) NOT NULL DEFAULT 'ZAR',
  "totalProductCost" DECIMAL(19,4) NOT NULL DEFAULT 0, "totalServiceCost" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "totalAdditionalCost" DECIMAL(19,4) NOT NULL DEFAULT 0, "totalCostBeforeVat" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "totalVat" DECIMAL(19,4) NOT NULL DEFAULT 0, "sellingBeforeVat" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "sellingIncludingVat" DECIMAL(19,4) NOT NULL DEFAULT 0, "grossProfit" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "grossProfitPercent" DECIMAL(7,4) NOT NULL DEFAULT 0, "commissionAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "expectedProfit" DECIMAL(19,4) NOT NULL DEFAULT 0, "submittedForApprovalAt" TIMESTAMP(3),
  "submittedExternallyAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RfqOpportunity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqOpportunity_referenceNumber_key" ON "RfqOpportunity"("referenceNumber");
CREATE INDEX "RfqOpportunity_companyId_status_closingAt_idx" ON "RfqOpportunity"("companyId","status","closingAt");
CREATE INDEX "RfqOpportunity_departmentId_status_idx" ON "RfqOpportunity"("departmentId","status");
CREATE INDEX "RfqOpportunity_assignedUserId_status_closingAt_idx" ON "RfqOpportunity"("assignedUserId","status","closingAt");
CREATE INDEX "RfqOpportunity_issuingOrganisation_createdAt_idx" ON "RfqOpportunity"("issuingOrganisation","createdAt");
CREATE INDEX "RfqOpportunity_externalReference_idx" ON "RfqOpportunity"("externalReference");

CREATE TABLE "RfqSource" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "documentId" UUID, "type" "RfqSourceType" NOT NULL,
  "label" TEXT NOT NULL, "sourceUrl" TEXT, "originalFilename" TEXT, "mimeType" TEXT, "size" INTEGER,
  "uploadedById" UUID NOT NULL, "processingStatus" "RfqProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "extractedText" TEXT, "analysisResult" JSONB, "analysisError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RfqSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqSource_documentId_key" ON "RfqSource"("documentId");
CREATE INDEX "RfqSource_rfqId_processingStatus_idx" ON "RfqSource"("rfqId","processingStatus");

CREATE TABLE "RfqAnalysis" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "sourceId" UUID, "rawOutput" JSONB NOT NULL,
  "confirmedOutput" JSONB, "confidence" DECIMAL(5,4), "requiresHumanReview" BOOLEAN NOT NULL DEFAULT true,
  "reviewedById" UUID, "reviewedAt" TIMESTAMP(3), "decision" TEXT, "changeSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RfqAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqAnalysis_rfqId_createdAt_idx" ON "RfqAnalysis"("rfqId","createdAt");
CREATE INDEX "RfqAnalysis_reviewedById_reviewedAt_idx" ON "RfqAnalysis"("reviewedById","reviewedAt");

CREATE TABLE "RfqRequirement" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "category" TEXT NOT NULL, "description" TEXT NOT NULL,
  "mandatory" BOOLEAN NOT NULL DEFAULT false, "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "sourceRef" TEXT, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RfqRequirement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqRequirement_rfqId_mandatory_confirmed_idx" ON "RfqRequirement"("rfqId","mandatory","confirmed");

CREATE TABLE "RfqLineItem" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "productId" UUID, "supplierId" UUID,
  "description" TEXT NOT NULL, "specification" TEXT, "supplierQuotationRef" TEXT,
  "isService" BOOLEAN NOT NULL DEFAULT false, "quantity" DECIMAL(19,4) NOT NULL,
  "unitOfMeasure" TEXT NOT NULL DEFAULT 'each', "unitCost" DECIMAL(19,4) NOT NULL,
  "pricingMethod" "RfqPricingMethod" NOT NULL DEFAULT 'MARKUP', "pricingPercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "sellingPricePerUnit" DECIMAL(19,4) NOT NULL, "costSubtotal" DECIMAL(19,4) NOT NULL,
  "sellingSubtotal" DECIMAL(19,4) NOT NULL, "vatRate" DECIMAL(7,4) NOT NULL DEFAULT 0.15,
  "vatAmount" DECIMAL(19,4) NOT NULL, "profit" DECIMAL(19,4) NOT NULL, "availability" TEXT,
  "leadTimeDays" INTEGER, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RfqLineItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqLineItem_rfqId_idx" ON "RfqLineItem"("rfqId");
CREATE INDEX "RfqLineItem_productId_idx" ON "RfqLineItem"("productId");
CREATE INDEX "RfqLineItem_supplierId_idx" ON "RfqLineItem"("supplierId");

CREATE TABLE "RfqAdditionalCost" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "documentId" UUID, "category" "RfqCostCategory" NOT NULL,
  "description" TEXT NOT NULL, "amount" DECIMAL(19,4) NOT NULL, "vatRate" DECIMAL(7,4) NOT NULL DEFAULT 0.15,
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RfqAdditionalCost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqAdditionalCost_documentId_key" ON "RfqAdditionalCost"("documentId");
CREATE INDEX "RfqAdditionalCost_rfqId_category_idx" ON "RfqAdditionalCost"("rfqId","category");

CREATE TABLE "RfqPricingRevision" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "revision" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
  "createdById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RfqPricingRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqPricingRevision_rfqId_revision_key" ON "RfqPricingRevision"("rfqId","revision");

CREATE TABLE "RfqApproval" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "revision" INTEGER NOT NULL,
  "decision" "RfqDecision" NOT NULL DEFAULT 'PENDING', "approverId" UUID, "comments" TEXT,
  "decidedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RfqApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqApproval_rfqId_decision_createdAt_idx" ON "RfqApproval"("rfqId","decision","createdAt");

CREATE TABLE "RfqCommission" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "recipientId" UUID, "type" "RfqCommissionType" NOT NULL, "percentage" DECIMAL(7,4),
  "amount" DECIMAL(19,4) NOT NULL DEFAULT 0, "approvalStatus" "RfqDecision" NOT NULL DEFAULT 'PENDING',
  "approvedById" UUID, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "RfqCommission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqCommission_rfqId_key" ON "RfqCommission"("rfqId");

CREATE TABLE "RfqStatusHistory" (
  "id" UUID NOT NULL, "rfqId" UUID NOT NULL, "fromStatus" "RfqStatus", "toStatus" "RfqStatus" NOT NULL,
  "actorId" UUID NOT NULL, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RfqStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqStatusHistory_rfqId_createdAt_idx" ON "RfqStatusHistory"("rfqId","createdAt");

ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqOpportunity" ADD CONSTRAINT "RfqOpportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqOpportunity" ADD CONSTRAINT "RfqOpportunity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqOpportunity" ADD CONSTRAINT "RfqOpportunity_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqOpportunity" ADD CONSTRAINT "RfqOpportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqSource" ADD CONSTRAINT "RfqSource_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqSource" ADD CONSTRAINT "RfqSource_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqSource" ADD CONSTRAINT "RfqSource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqAnalysis" ADD CONSTRAINT "RfqAnalysis_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqAnalysis" ADD CONSTRAINT "RfqAnalysis_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RfqSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqAnalysis" ADD CONSTRAINT "RfqAnalysis_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqRequirement" ADD CONSTRAINT "RfqRequirement_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqLineItem" ADD CONSTRAINT "RfqLineItem_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqLineItem" ADD CONSTRAINT "RfqLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqLineItem" ADD CONSTRAINT "RfqLineItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqAdditionalCost" ADD CONSTRAINT "RfqAdditionalCost_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqAdditionalCost" ADD CONSTRAINT "RfqAdditionalCost_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqPricingRevision" ADD CONSTRAINT "RfqPricingRevision_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqApproval" ADD CONSTRAINT "RfqApproval_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqApproval" ADD CONSTRAINT "RfqApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RfqCommission" ADD CONSTRAINT "RfqCommission_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqStatusHistory" ADD CONSTRAINT "RfqStatusHistory_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqStatusHistory" ADD CONSTRAINT "RfqStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id","key","description","createdAt","updatedAt")
SELECT gen_random_uuid(), key, 'RFQ and tender management permission', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM unnest(ARRAY['rfq.view','rfq.create','rfq.update','rfq.delete','rfq.analyse','rfq.price','rfq.submit','rfq.approve','rfq.reject','rfq.assign','rfq.export','rfq.financials.view','rfq.commission.manage']) AS key
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT role."id", permission."id", 'ALLOW'::"PermissionEffect", CURRENT_TIMESTAMP
FROM "Role" role
JOIN "Permission" permission ON permission."key" LIKE 'rfq.%'
WHERE
  role."slug" = 'super-administrator'
  OR (role."slug" = 'administrator' AND permission."key" NOT IN ('rfq.approve','rfq.commission.manage'))
  OR (role."slug" = 'sales' AND permission."key" IN ('rfq.view','rfq.create','rfq.update','rfq.analyse','rfq.price','rfq.submit','rfq.assign','rfq.financials.view'))
  OR (role."slug" = 'finance' AND permission."key" IN ('rfq.view','rfq.price','rfq.approve','rfq.reject','rfq.financials.view','rfq.commission.manage'))
ON CONFLICT ("roleId","permissionId") DO NOTHING;
