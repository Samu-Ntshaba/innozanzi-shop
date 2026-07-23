CREATE TYPE "DocumentOrigin" AS ENUM ('WEBSITE','ADMIN','MANUAL','AUTOMATED','API','IMPORTED');
CREATE TYPE "DeliveryNoteStatus" AS ENUM ('DRAFT','READY_FOR_DELIVERY','PARTIALLY_DELIVERED','DELIVERED','ACKNOWLEDGED','CANCELLED');
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CREDITED';

ALTER TABLE "User" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Payment" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "QuotationRequest" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quotation" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UploadedDocument" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Invoice"
  ADD COLUMN "orderId" UUID,
  ADD COLUMN "createdById" UUID,
  ADD COLUMN "updatedById" UUID,
  ADD COLUMN "origin" "DocumentOrigin" NOT NULL DEFAULT 'AUTOMATED',
  ADD COLUMN "billingAddress" TEXT,
  ADD COLUMN "discountTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN "amountPaid" DECIMAL(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN "balanceDue" DECIMAL(19,4) NOT NULL DEFAULT 0,
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "paymentTerms" TEXT,
  ADD COLUMN "bankDetails" TEXT,
  ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Invoice" SET "balanceDue" = "grandTotal";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");
CREATE INDEX "Invoice_origin_createdAt_idx" ON "Invoice"("origin","createdAt");

CREATE TABLE "InvoiceItem" (
  "id" UUID NOT NULL, "invoiceId" UUID NOT NULL, "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL(19,4) NOT NULL,
  "discountTotal" DECIMAL(19,4) NOT NULL DEFAULT 0, "vatRate" DECIMAL(7,4) NOT NULL DEFAULT 15,
  "vatTotal" DECIMAL(19,4) NOT NULL, "lineTotal" DECIMAL(19,4) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InvoiceItem_invoiceId_sortOrder_idx" ON "InvoiceItem"("invoiceId","sortOrder");

CREATE TABLE "InvoicePayment" (
  "id" UUID NOT NULL, "invoiceId" UUID NOT NULL, "amount" DECIMAL(19,4) NOT NULL,
  "method" "PaymentProvider" NOT NULL DEFAULT 'EFT', "reference" TEXT, "note" TEXT,
  "paidAt" TIMESTAMP(3) NOT NULL, "recordedById" UUID, "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InvoicePayment_invoiceId_paidAt_idx" ON "InvoicePayment"("invoiceId","paidAt");

CREATE TABLE "DeliveryNote" (
  "id" UUID NOT NULL, "deliveryNoteNumber" TEXT NOT NULL, "orderId" UUID, "quotationId" UUID, "invoiceId" UUID,
  "createdById" UUID, "updatedById" UUID, "responsibleStaffId" UUID, "confirmedById" UUID,
  "origin" "DocumentOrigin" NOT NULL DEFAULT 'AUTOMATED', "status" "DeliveryNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "customerName" TEXT NOT NULL, "customerEmail" TEXT, "customerPhone" TEXT, "companyName" TEXT,
  "deliveryAddress" TEXT NOT NULL, "deliveryDate" TIMESTAMP(3), "deliveryMethod" TEXT, "reference" TEXT,
  "instructions" TEXT, "customerNote" TEXT, "internalNote" TEXT, "confirmationName" TEXT, "confirmationNote" TEXT,
  "customerConfirmedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
  "isTestData" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryNote_deliveryNoteNumber_key" ON "DeliveryNote"("deliveryNoteNumber");
CREATE INDEX "DeliveryNote_status_deliveryDate_idx" ON "DeliveryNote"("status","deliveryDate");
CREATE INDEX "DeliveryNote_orderId_idx" ON "DeliveryNote"("orderId");
CREATE INDEX "DeliveryNote_origin_createdAt_idx" ON "DeliveryNote"("origin","createdAt");
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_responsibleStaffId_fkey" FOREIGN KEY ("responsibleStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DeliveryNoteItem" (
  "id" UUID NOT NULL, "deliveryNoteId" UUID NOT NULL, "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL, "deliveredQty" INTEGER NOT NULL DEFAULT 0, "condition" TEXT, "note" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0, "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryNoteItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNoteItem_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DeliveryNoteItem_deliveryNoteId_sortOrder_idx" ON "DeliveryNoteItem"("deliveryNoteId","sortOrder");

CREATE TABLE "DeliveryNoteHistory" (
  "id" UUID NOT NULL, "deliveryNoteId" UUID NOT NULL, "fromStatus" "DeliveryNoteStatus",
  "toStatus" "DeliveryNoteStatus" NOT NULL, "actorId" UUID, "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryNoteHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNoteHistory_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DeliveryNoteHistory_deliveryNoteId_createdAt_idx" ON "DeliveryNoteHistory"("deliveryNoteId","createdAt");

CREATE TABLE "DeliveryNoteAttachment" (
  "id" UUID NOT NULL, "deliveryNoteId" UUID NOT NULL, "documentId" UUID NOT NULL,
  "type" TEXT NOT NULL, "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryNoteAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNoteAttachment_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeliveryNoteAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DeliveryNoteAttachment_documentId_key" ON "DeliveryNoteAttachment"("documentId");
CREATE INDEX "DeliveryNoteAttachment_deliveryNoteId_type_idx" ON "DeliveryNoteAttachment"("deliveryNoteId","type");

CREATE TABLE "TestAsset" (
  "id" UUID NOT NULL, "key" TEXT NOT NULL, "type" TEXT NOT NULL, "bucket" TEXT NOT NULL,
  "path" TEXT NOT NULL, "publicUrl" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL,
  "isTestData" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TestAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TestAsset_key_key" ON "TestAsset"("key");
CREATE INDEX "TestAsset_type_createdAt_idx" ON "TestAsset"("type","createdAt");
