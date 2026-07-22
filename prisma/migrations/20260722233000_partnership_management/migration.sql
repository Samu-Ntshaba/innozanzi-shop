-- CreateEnum
CREATE TYPE "PartnershipTrack" AS ENUM ('ECOMMERCE', 'BUSINESS_PROCUREMENT', 'GROWTH');

-- CreateEnum
CREATE TYPE "PartnershipStatus" AS ENUM ('NOT_APPLIED', 'DRAFT', 'SUBMITTED', 'DOCUMENTS_REQUIRED', 'UNDER_REVIEW', 'DUE_DILIGENCE', 'CHANGES_REQUESTED', 'APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PartnershipDocumentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REPLACEMENT_REQUIRED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PartnerRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED', 'ASSIGNED', 'SOURCING', 'AWAITING_SUPPLIER', 'RESPONSE_READY', 'OFFER_SENT', 'CHANGES_REQUESTED', 'ACCEPTED', 'DECLINED', 'CONVERTED_TO_QUOTATION', 'CONVERTED_TO_ORDER', 'FULFILLED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartnerRequestType" AS ENUM ('ECOMMERCE_SOURCING', 'BUSINESS_PROCUREMENT', 'RECURRING_SUPPLY', 'PROJECT', 'PRODUCT_RECOMMENDATION');

-- CreateEnum
CREATE TYPE "PartnerRequestUrgency" AS ENUM ('NORMAL', 'URGENT', 'PROJECT');

-- CreateEnum
CREATE TYPE "PartnerOfferStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PartnerTermType" AS ENUM ('STANDARD_DISCOUNT', 'CATEGORY_DISCOUNT', 'PRODUCT_PRICE', 'QUANTITY_PRICE', 'PAYMENT_TERMS', 'DELIVERY_TERMS', 'SINGLE_ITEM_PERMISSION', 'OTHER');

-- CreateTable
CREATE TABLE "PartnershipType" (
    "id" UUID NOT NULL,
    "track" "PartnershipTrack" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefits" TEXT NOT NULL,
    "eligibilitySummary" TEXT NOT NULL,
    "requiredDocumentTypes" TEXT[],
    "reviewFrequencyMonths" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipApplication" (
    "id" UUID NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "activeKey" TEXT,
    "partnershipTypeId" UUID NOT NULL,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "registeredBusinessName" TEXT,
    "tradingName" TEXT,
    "registrationNumber" TEXT,
    "vatNumber" TEXT,
    "businessAddress" TEXT,
    "representativeName" TEXT,
    "representativeRole" TEXT,
    "representativePhone" TEXT,
    "businessProfile" TEXT,
    "productCategories" TEXT[],
    "purchasingFrequency" TEXT,
    "estimatedMonthlyValue" DECIMAL(19,4),
    "salesChannels" TEXT[],
    "marketplaceLinks" TEXT[],
    "references" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "accuracyDeclaredAt" TIMESTAMP(3),
    "verificationConsentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewerId" UUID,
    "accountManagerId" UUID,
    "internalNote" TEXT,
    "customerResponseNote" TEXT,
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipApplicationSection" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipApplicationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipApplicationDocument" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "PartnershipDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedById" UUID NOT NULL,
    "reviewNote" TEXT,
    "expiryDate" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partnership" (
    "id" UUID NOT NULL,
    "partnerNumber" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "partnershipTypeId" UUID NOT NULL,
    "sourceApplicationId" UUID NOT NULL,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'APPROVED',
    "accountManagerId" UUID,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "standingSummary" TEXT,
    "internalStandingScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipStatusHistory" (
    "id" UUID NOT NULL,
    "applicationId" UUID,
    "partnershipId" UUID,
    "fromStatus" "PartnershipStatus",
    "toStatus" "PartnershipStatus" NOT NULL,
    "actorId" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnershipStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerBenefit" (
    "id" UUID NOT NULL,
    "partnershipId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCommercialTerm" (
    "id" UUID NOT NULL,
    "partnershipId" UUID NOT NULL,
    "type" "PartnerTermType" NOT NULL,
    "title" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "categoryId" UUID,
    "productId" UUID,
    "minimumQty" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCommercialTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnershipReview" (
    "id" UUID NOT NULL,
    "partnershipId" UUID NOT NULL,
    "reviewType" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "internalNote" TEXT,
    "reviewedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnershipReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequest" (
    "id" UUID NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "partnershipId" UUID NOT NULL,
    "type" "PartnerRequestType" NOT NULL,
    "status" "PartnerRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "urgency" "PartnerRequestUrgency" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "marketplace" TEXT,
    "targetPrice" DECIMAL(19,4),
    "requiredMargin" DECIMAL(7,4),
    "deliveryLocation" TEXT,
    "requiredDate" TIMESTAMP(3),
    "recurringSchedule" TEXT,
    "assignedToId" UUID,
    "customerNote" TEXT,
    "internalNote" TEXT,
    "adminResponse" TEXT,
    "linkedQuotationId" UUID,
    "linkedOrderId" UUID,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequestItem" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "productId" UUID,
    "sku" TEXT,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PartnerRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequestOffer" (
    "id" UUID NOT NULL,
    "offerNumber" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "status" "PartnerOfferStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'ZAR',
    "subtotal" DECIMAL(19,4) NOT NULL,
    "vatTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "deliveryTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(19,4) NOT NULL,
    "availability" TEXT,
    "leadTime" TEXT,
    "deliveryEstimate" TEXT,
    "commercialTerms" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "customerResponse" TEXT,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerRequestOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequestOfferItem" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "productId" UUID,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(19,4) NOT NULL,
    "vatTotal" DECIMAL(19,4) NOT NULL,
    "lineTotal" DECIMAL(19,4) NOT NULL,
    "isAlternative" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PartnerRequestOfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerRequestAttachment" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerRequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerTrackChangeRequest" (
    "id" UUID NOT NULL,
    "partnershipId" UUID NOT NULL,
    "requestedTypeId" UUID NOT NULL,
    "status" "PartnershipStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerTrackChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerActivity" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "publicNote" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMessage" (
    "id" UUID NOT NULL,
    "partnershipId" UUID NOT NULL,
    "requestId" UUID,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipType_track_key" ON "PartnershipType"("track");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipApplication_applicationNumber_key" ON "PartnershipApplication"("applicationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipApplication_activeKey_key" ON "PartnershipApplication"("activeKey");

-- CreateIndex
CREATE INDEX "PartnershipApplication_userId_status_createdAt_idx" ON "PartnershipApplication"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnershipApplication_status_submittedAt_idx" ON "PartnershipApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "PartnershipApplication_partnershipTypeId_status_idx" ON "PartnershipApplication"("partnershipTypeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipApplicationSection_applicationId_sectionKey_key" ON "PartnershipApplicationSection"("applicationId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "PartnershipApplicationDocument_documentId_key" ON "PartnershipApplicationDocument"("documentId");

-- CreateIndex
CREATE INDEX "PartnershipApplicationDocument_applicationId_documentType_idx" ON "PartnershipApplicationDocument"("applicationId", "documentType");

-- CreateIndex
CREATE INDEX "PartnershipApplicationDocument_status_expiryDate_idx" ON "PartnershipApplicationDocument"("status", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_partnerNumber_key" ON "Partnership"("partnerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Partnership_sourceApplicationId_key" ON "Partnership"("sourceApplicationId");

-- CreateIndex
CREATE INDEX "Partnership_userId_status_idx" ON "Partnership"("userId", "status");

-- CreateIndex
CREATE INDEX "Partnership_status_renewalDate_idx" ON "Partnership"("status", "renewalDate");

-- CreateIndex
CREATE INDEX "PartnershipStatusHistory_applicationId_createdAt_idx" ON "PartnershipStatusHistory"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnershipStatusHistory_partnershipId_createdAt_idx" ON "PartnershipStatusHistory"("partnershipId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerCommercialTerm_partnershipId_isActive_idx" ON "PartnerCommercialTerm"("partnershipId", "isActive");

-- CreateIndex
CREATE INDEX "PartnershipReview_dueAt_completedAt_idx" ON "PartnershipReview"("dueAt", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRequest_requestNumber_key" ON "PartnerRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "PartnerRequest_partnershipId_status_createdAt_idx" ON "PartnerRequest"("partnershipId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerRequest_status_urgency_submittedAt_idx" ON "PartnerRequest"("status", "urgency", "submittedAt");

-- CreateIndex
CREATE INDEX "PartnerRequestItem_requestId_idx" ON "PartnerRequestItem"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRequestOffer_offerNumber_key" ON "PartnerRequestOffer"("offerNumber");

-- CreateIndex
CREATE INDEX "PartnerRequestOffer_requestId_status_idx" ON "PartnerRequestOffer"("requestId", "status");

-- CreateIndex
CREATE INDEX "PartnerRequestOffer_status_validUntil_idx" ON "PartnerRequestOffer"("status", "validUntil");

-- CreateIndex
CREATE INDEX "PartnerRequestOfferItem_offerId_idx" ON "PartnerRequestOfferItem"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerRequestAttachment_documentId_key" ON "PartnerRequestAttachment"("documentId");

-- CreateIndex
CREATE INDEX "PartnerActivity_requestId_createdAt_idx" ON "PartnerActivity"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerMessage_partnershipId_createdAt_idx" ON "PartnerMessage"("partnershipId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerMessage_requestId_createdAt_idx" ON "PartnerMessage"("requestId", "createdAt");

-- AddForeignKey
ALTER TABLE "PartnershipApplication" ADD CONSTRAINT "PartnershipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplication" ADD CONSTRAINT "PartnershipApplication_partnershipTypeId_fkey" FOREIGN KEY ("partnershipTypeId") REFERENCES "PartnershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplication" ADD CONSTRAINT "PartnershipApplication_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplication" ADD CONSTRAINT "PartnershipApplication_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplicationSection" ADD CONSTRAINT "PartnershipApplicationSection_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplicationDocument" ADD CONSTRAINT "PartnershipApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplicationDocument" ADD CONSTRAINT "PartnershipApplicationDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplicationDocument" ADD CONSTRAINT "PartnershipApplicationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipApplicationDocument" ADD CONSTRAINT "PartnershipApplicationDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_partnershipTypeId_fkey" FOREIGN KEY ("partnershipTypeId") REFERENCES "PartnershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_sourceApplicationId_fkey" FOREIGN KEY ("sourceApplicationId") REFERENCES "PartnershipApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partnership" ADD CONSTRAINT "Partnership_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipStatusHistory" ADD CONSTRAINT "PartnershipStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PartnershipApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipStatusHistory" ADD CONSTRAINT "PartnershipStatusHistory_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipStatusHistory" ADD CONSTRAINT "PartnershipStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerBenefit" ADD CONSTRAINT "PartnerBenefit_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommercialTerm" ADD CONSTRAINT "PartnerCommercialTerm_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipReview" ADD CONSTRAINT "PartnershipReview_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnershipReview" ADD CONSTRAINT "PartnershipReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequest" ADD CONSTRAINT "PartnerRequest_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequestItem" ADD CONSTRAINT "PartnerRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartnerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequestItem" ADD CONSTRAINT "PartnerRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequestOffer" ADD CONSTRAINT "PartnerRequestOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartnerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequestOfferItem" ADD CONSTRAINT "PartnerRequestOfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PartnerRequestOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequestAttachment" ADD CONSTRAINT "PartnerRequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartnerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerRequestAttachment" ADD CONSTRAINT "PartnerRequestAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerTrackChangeRequest" ADD CONSTRAINT "PartnerTrackChangeRequest_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerTrackChangeRequest" ADD CONSTRAINT "PartnerTrackChangeRequest_requestedTypeId_fkey" FOREIGN KEY ("requestedTypeId") REFERENCES "PartnershipType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerActivity" ADD CONSTRAINT "PartnerActivity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartnerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PartnerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMessage" ADD CONSTRAINT "PartnerMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
