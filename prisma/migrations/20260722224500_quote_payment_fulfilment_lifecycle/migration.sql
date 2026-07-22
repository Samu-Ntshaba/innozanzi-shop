ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_VERIFIED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SOURCING_ITEMS';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ITEMS_RECEIVED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PACKING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPATCHED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'PROVISIONAL_GENERATED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'FINAL_APPROVED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_SUBMITTED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_VERIFIED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_REJECTED';

CREATE TYPE "QuotationKind" AS ENUM ('PROVISIONAL', 'FINAL');
CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'CORRECTION_REQUIRED');

ALTER TABLE "Quotation"
  ADD COLUMN "kind" "QuotationKind" NOT NULL DEFAULT 'PROVISIONAL',
  ADD COLUMN "markupPercent" DECIMAL(7,4) NOT NULL DEFAULT 5,
  ADD COLUMN "finalApprovedAt" TIMESTAMP(3),
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "bankDetails" TEXT;
ALTER TABLE "QuotationItem" ADD COLUMN "costPrice" DECIMAL(19,4);

CREATE TABLE "QuotationVersion" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "quotationId" UUID NOT NULL,
  "version" INTEGER NOT NULL, "kind" "QuotationKind" NOT NULL, "snapshot" JSONB NOT NULL,
  "createdById" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuotationVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuotationVersion_quotationId_version_key" ON "QuotationVersion"("quotationId", "version");
CREATE INDEX "QuotationVersion_quotationId_createdAt_idx" ON "QuotationVersion"("quotationId", "createdAt");
ALTER TABLE "QuotationVersion" ADD CONSTRAINT "QuotationVersion_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UploadedDocument" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "bucket" TEXT NOT NULL, "path" TEXT NOT NULL,
  "originalName" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "isPrivate" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UploadedDocument_path_key" ON "UploadedDocument"("path");

CREATE TABLE "PaymentSubmission" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "quotationId" UUID NOT NULL, "orderId" UUID,
  "submittedById" UUID NOT NULL, "documentId" UUID NOT NULL, "amount" DECIMAL(19,4) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL, "paymentReference" TEXT NOT NULL, "customerNote" TEXT,
  "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION', "rejectionReason" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentSubmission_documentId_key" ON "PaymentSubmission"("documentId");
CREATE INDEX "PaymentSubmission_status_submittedAt_idx" ON "PaymentSubmission"("status", "submittedAt");
CREATE INDEX "PaymentSubmission_quotationId_submittedAt_idx" ON "PaymentSubmission"("quotationId", "submittedAt");
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PaymentVerification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "paymentSubmissionId" UUID NOT NULL, "verifiedById" UUID NOT NULL,
  "decision" "PaymentSubmissionStatus" NOT NULL, "internalNote" TEXT, "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentVerification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentVerification_paymentSubmissionId_key" ON "PaymentVerification"("paymentSubmissionId");
ALTER TABLE "PaymentVerification" ADD CONSTRAINT "PaymentVerification_paymentSubmissionId_fkey" FOREIGN KEY ("paymentSubmissionId") REFERENCES "PaymentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentVerification" ADD CONSTRAINT "PaymentVerification_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DeliveryTrackingEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "orderId" UUID NOT NULL, "status" "OrderStatus" NOT NULL,
  "publicNote" TEXT, "internalNote" TEXT, "actorId" UUID, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryTrackingEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeliveryTrackingEvent_orderId_occurredAt_idx" ON "DeliveryTrackingEvent"("orderId", "occurredAt");
ALTER TABLE "DeliveryTrackingEvent" ADD CONSTRAINT "DeliveryTrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryTrackingEvent" ADD CONSTRAINT "DeliveryTrackingEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
