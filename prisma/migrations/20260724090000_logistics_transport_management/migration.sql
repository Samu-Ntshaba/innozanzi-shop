-- CreateEnum
CREATE TYPE "TransportStatus" AS ENUM ('DRAFT', 'REQUESTED', 'AWAITING_QUOTATION', 'QUOTATION_RECEIVED', 'AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'DRIVER_ASSIGNED', 'COLLECTION_PENDING', 'COLLECTED', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TransportPaymentStatus" AS ENUM ('NOT_INVOICED', 'INVOICE_PENDING', 'INVOICE_RECEIVED', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'PAID', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransportProviderType" AS ENUM ('COURIER_COMPANY', 'LOGISTICS_COMPANY', 'SUPPLIER_DELIVERY', 'DISTRIBUTOR_DELIVERY', 'INTERNAL_DRIVER', 'INTERNAL_STAFF', 'TECHNICIAN', 'CUSTOMER_COLLECTION', 'INDEPENDENT_DRIVER', 'RIDE_HAILING', 'RENTAL_VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportCostResponsibility" AS ENUM ('CUSTOMER', 'INNOZANZI', 'SUPPLIER', 'DISTRIBUTOR', 'SHARED', 'INCLUDED_IN_PRODUCT_PRICE', 'INCLUDED_IN_PARTNERSHIP', 'RECOVERABLE_FROM_SUPPLIER', 'RECOVERABLE_FROM_CUSTOMER', 'WAIVED', 'OTHER');

-- CreateEnum
CREATE TYPE "TransportAllocationMethod" AS ENUM ('EQUAL_PER_ITEM', 'BY_QUANTITY', 'BY_PRODUCT_VALUE', 'BY_WEIGHT', 'BY_VOLUME', 'MANUAL', 'NONE', 'FULL_ORDER');

-- CreateEnum
CREATE TYPE "TransportProofType" AS ENUM ('COLLECTION', 'DELIVERY', 'FAILED_DELIVERY');

-- CreateEnum
CREATE TYPE "TransportQuoteStatus" AS ENUM ('RECEIVED', 'SELECTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransportExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'AWAITING_PAYMENT', 'PAID');

-- CreateTable
CREATE TABLE "TransportCategory" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requiresProducts" BOOLEAN NOT NULL DEFAULT false,
    "requiresProof" BOOLEAN NOT NULL DEFAULT false,
    "defaultResponsibility" "TransportCostResponsibility" NOT NULL DEFAULT 'INNOZANZI',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportCostType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportCostType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportProvider" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransportProviderType" NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "registrationDetails" TEXT,
    "serviceAreas" TEXT[],
    "vehicleTypes" TEXT[],
    "standardPricing" TEXT,
    "accountNumber" TEXT,
    "paymentTerms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportProviderDocument" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportProviderDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRecord" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "TransportStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "TransportPaymentStatus" NOT NULL DEFAULT 'NOT_INVOICED',
    "responsibility" "TransportCostResponsibility" NOT NULL DEFAULT 'INNOZANZI',
    "allocationMethod" "TransportAllocationMethod" NOT NULL DEFAULT 'NONE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceKm" DECIMAL(12,3),
    "estimatedWeightKg" DECIMAL(12,3),
    "estimatedVolumeM3" DECIMAL(12,4),
    "packageCount" INTEGER,
    "providerId" UUID,
    "driverId" UUID,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehicle" TEXT,
    "vehicleRegistration" TEXT,
    "requestedById" UUID NOT NULL,
    "responsibleUserId" UUID,
    "technicianId" UUID,
    "customerId" UUID,
    "supplierId" UUID,
    "orderId" UUID,
    "purchaseOrderReference" TEXT,
    "deliveryNoteId" UUID,
    "returnCaseId" UUID,
    "distributorClaimId" UUID,
    "partnershipId" UUID,
    "relatedPaymentId" UUID,
    "estimatedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "approvedBudget" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "quotedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "actualAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "vatAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "customerCharge" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "supplierRecovery" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "distributorRecovery" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "varianceReason" TEXT,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "specialInstructions" TEXT,
    "customerVisibleNote" TEXT,
    "internalNote" TEXT,
    "failureReason" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "isTestData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportItem" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "productId" UUID,
    "orderItemId" UUID,
    "description" TEXT NOT NULL,
    "sku" TEXT,
    "serialNumbers" TEXT[],
    "quantity" INTEGER NOT NULL,
    "weightKg" DECIMAL(12,3),
    "volumeM3" DECIMAL(12,4),
    "packageCount" INTEGER,
    "conditionAtCollection" TEXT,
    "handlingInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportQuote" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "providerId" UUID,
    "quoteNumber" TEXT,
    "status" "TransportQuoteStatus" NOT NULL DEFAULT 'RECEIVED',
    "quotedAmount" DECIMAL(19,4) NOT NULL,
    "vatAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "additionalFees" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "documentId" UUID,
    "notes" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "TransportQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportCostComponent" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "costTypeId" UUID NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitRate" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(19,4) NOT NULL,
    "vatAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(19,4) NOT NULL,
    "isActual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportCostComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportExpense" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "approvedById" UUID,
    "status" "TransportExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "description" TEXT,
    "documentId" UUID,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportPayment" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "processedById" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "proofDocumentId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportCostAllocation" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "productId" UUID,
    "orderId" UUID,
    "returnCaseId" UUID,
    "method" "TransportAllocationMethod" NOT NULL,
    "basisValue" DECIMAL(19,4),
    "amount" DECIMAL(19,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportCostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportProof" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "type" "TransportProofType" NOT NULL,
    "recipientName" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "signatureData" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "condition" TEXT,
    "quantityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "missingItems" TEXT,
    "damagedItems" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportProofDocument" (
    "id" UUID NOT NULL,
    "proofId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportProofDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTransportReimbursement" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "approvedById" UUID,
    "status" "TransportExpenseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "expenseType" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "receiptDocumentId" UUID,
    "approvalNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTransportReimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportDocument" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportEvent" (
    "id" UUID NOT NULL,
    "transportId" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "fromStatus" "TransportStatus",
    "toStatus" "TransportStatus",
    "publicNote" TEXT,
    "internalNote" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransportCategory_code_key" ON "TransportCategory"("code");

-- CreateIndex
CREATE INDEX "TransportCategory_isActive_displayOrder_idx" ON "TransportCategory"("isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TransportCostType_code_key" ON "TransportCostType"("code");

-- CreateIndex
CREATE INDEX "TransportCostType_isActive_displayOrder_idx" ON "TransportCostType"("isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "TransportProvider_isActive_name_idx" ON "TransportProvider"("isActive", "name");

-- CreateIndex
CREATE INDEX "TransportProvider_type_isActive_idx" ON "TransportProvider"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TransportProviderDocument_documentId_key" ON "TransportProviderDocument"("documentId");

-- CreateIndex
CREATE INDEX "TransportProviderDocument_providerId_type_idx" ON "TransportProviderDocument"("providerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRecord_referenceNumber_key" ON "TransportRecord"("referenceNumber");

-- CreateIndex
CREATE INDEX "TransportRecord_status_scheduledAt_idx" ON "TransportRecord"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "TransportRecord_paymentStatus_createdAt_idx" ON "TransportRecord"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "TransportRecord_orderId_createdAt_idx" ON "TransportRecord"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportRecord_returnCaseId_createdAt_idx" ON "TransportRecord"("returnCaseId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportRecord_providerId_createdAt_idx" ON "TransportRecord"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportRecord_technicianId_scheduledAt_idx" ON "TransportRecord"("technicianId", "scheduledAt");

-- CreateIndex
CREATE INDEX "TransportRecord_customerId_createdAt_idx" ON "TransportRecord"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportItem_transportId_idx" ON "TransportItem"("transportId");

-- CreateIndex
CREATE INDEX "TransportItem_productId_idx" ON "TransportItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportQuote_documentId_key" ON "TransportQuote"("documentId");

-- CreateIndex
CREATE INDEX "TransportQuote_transportId_status_idx" ON "TransportQuote"("transportId", "status");

-- CreateIndex
CREATE INDEX "TransportQuote_providerId_receivedAt_idx" ON "TransportQuote"("providerId", "receivedAt");

-- CreateIndex
CREATE INDEX "TransportCostComponent_transportId_isActual_idx" ON "TransportCostComponent"("transportId", "isActual");

-- CreateIndex
CREATE INDEX "TransportCostComponent_costTypeId_idx" ON "TransportCostComponent"("costTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportExpense_documentId_key" ON "TransportExpense"("documentId");

-- CreateIndex
CREATE INDEX "TransportExpense_status_createdAt_idx" ON "TransportExpense"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TransportExpense_transportId_idx" ON "TransportExpense"("transportId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportPayment_proofDocumentId_key" ON "TransportPayment"("proofDocumentId");

-- CreateIndex
CREATE INDEX "TransportPayment_transportId_paymentDate_idx" ON "TransportPayment"("transportId", "paymentDate");

-- CreateIndex
CREATE INDEX "TransportPayment_paymentReference_idx" ON "TransportPayment"("paymentReference");

-- CreateIndex
CREATE INDEX "TransportCostAllocation_transportId_idx" ON "TransportCostAllocation"("transportId");

-- CreateIndex
CREATE INDEX "TransportCostAllocation_productId_idx" ON "TransportCostAllocation"("productId");

-- CreateIndex
CREATE INDEX "TransportProof_transportId_type_idx" ON "TransportProof"("transportId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "TransportProofDocument_documentId_key" ON "TransportProofDocument"("documentId");

-- CreateIndex
CREATE INDEX "TransportProofDocument_proofId_idx" ON "TransportProofDocument"("proofId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTransportReimbursement_receiptDocumentId_key" ON "StaffTransportReimbursement"("receiptDocumentId");

-- CreateIndex
CREATE INDEX "StaffTransportReimbursement_status_createdAt_idx" ON "StaffTransportReimbursement"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StaffTransportReimbursement_employeeId_status_idx" ON "StaffTransportReimbursement"("employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransportDocument_documentId_key" ON "TransportDocument"("documentId");

-- CreateIndex
CREATE INDEX "TransportDocument_transportId_type_idx" ON "TransportDocument"("transportId", "type");

-- CreateIndex
CREATE INDEX "TransportEvent_transportId_createdAt_idx" ON "TransportEvent"("transportId", "createdAt");

-- CreateIndex
CREATE INDEX "TransportEvent_action_createdAt_idx" ON "TransportEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "TransportProviderDocument" ADD CONSTRAINT "TransportProviderDocument_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportProviderDocument" ADD CONSTRAINT "TransportProviderDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransportCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_returnCaseId_fkey" FOREIGN KEY ("returnCaseId") REFERENCES "ReturnCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_distributorClaimId_fkey" FOREIGN KEY ("distributorClaimId") REFERENCES "DistributorClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_relatedPaymentId_fkey" FOREIGN KEY ("relatedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportItem" ADD CONSTRAINT "TransportItem_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportItem" ADD CONSTRAINT "TransportItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportQuote" ADD CONSTRAINT "TransportQuote_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportQuote" ADD CONSTRAINT "TransportQuote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "TransportProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportQuote" ADD CONSTRAINT "TransportQuote_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportCostComponent" ADD CONSTRAINT "TransportCostComponent_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportCostComponent" ADD CONSTRAINT "TransportCostComponent_costTypeId_fkey" FOREIGN KEY ("costTypeId") REFERENCES "TransportCostType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportExpense" ADD CONSTRAINT "TransportExpense_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportExpense" ADD CONSTRAINT "TransportExpense_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportExpense" ADD CONSTRAINT "TransportExpense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportExpense" ADD CONSTRAINT "TransportExpense_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportPayment" ADD CONSTRAINT "TransportPayment_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportPayment" ADD CONSTRAINT "TransportPayment_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportPayment" ADD CONSTRAINT "TransportPayment_proofDocumentId_fkey" FOREIGN KEY ("proofDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportCostAllocation" ADD CONSTRAINT "TransportCostAllocation_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportCostAllocation" ADD CONSTRAINT "TransportCostAllocation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportProof" ADD CONSTRAINT "TransportProof_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportProofDocument" ADD CONSTRAINT "TransportProofDocument_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "TransportProof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportProofDocument" ADD CONSTRAINT "TransportProofDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTransportReimbursement" ADD CONSTRAINT "StaffTransportReimbursement_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTransportReimbursement" ADD CONSTRAINT "StaffTransportReimbursement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTransportReimbursement" ADD CONSTRAINT "StaffTransportReimbursement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTransportReimbursement" ADD CONSTRAINT "StaffTransportReimbursement_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportDocument" ADD CONSTRAINT "TransportDocument_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportDocument" ADD CONSTRAINT "TransportDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportEvent" ADD CONSTRAINT "TransportEvent_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "TransportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportEvent" ADD CONSTRAINT "TransportEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Configurable operational defaults. Administrators may rename or disable these.
INSERT INTO "TransportCategory" ("id","code","name","requiresProducts","requiresProof","displayOrder","updatedAt") VALUES
(gen_random_uuid(),'SUPPLIER_COLLECTION','Supplier collection',true,true,10,NOW()),
(gen_random_uuid(),'CUSTOMER_DELIVERY','Customer delivery',true,true,20,NOW()),
(gen_random_uuid(),'CUSTOMER_COLLECTION','Customer collection',true,true,30,NOW()),
(gen_random_uuid(),'RETURN_COLLECTION','Return collection',true,true,40,NOW()),
(gen_random_uuid(),'RETURN_TO_SUPPLIER','Return to supplier',true,true,50,NOW()),
(gen_random_uuid(),'DISTRIBUTOR_RETURN','Distributor return',true,true,60,NOW()),
(gen_random_uuid(),'REPLACEMENT_DELIVERY','Replacement delivery',true,true,70,NOW()),
(gen_random_uuid(),'TECHNICIAN_TRAVEL','Technician travel',false,true,80,NOW()),
(gen_random_uuid(),'WAREHOUSE_TRANSFER','Warehouse transfer',true,true,90,NOW()),
(gen_random_uuid(),'OFFICE_TRANSPORT','Office transport',false,false,100,NOW()),
(gen_random_uuid(),'COURIER_DELIVERY','Courier delivery',true,true,110,NOW()),
(gen_random_uuid(),'EMERGENCY_DELIVERY','Emergency delivery',true,true,120,NOW()),
(gen_random_uuid(),'OTHER','Other business transport',false,false,999,NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "TransportCostType" ("id","code","name","displayOrder","updatedAt") VALUES
(gen_random_uuid(),'BASE_FEE','Base transport fee',10,NOW()),(gen_random_uuid(),'PER_KILOMETRE','Per-kilometre fee',20,NOW()),
(gen_random_uuid(),'FUEL','Fuel surcharge',30,NOW()),(gen_random_uuid(),'TOLLS','Toll fees',40,NOW()),
(gen_random_uuid(),'PARKING','Parking',50,NOW()),(gen_random_uuid(),'LOADING','Loading fee',60,NOW()),
(gen_random_uuid(),'UNLOADING','Unloading fee',70,NOW()),(gen_random_uuid(),'PACKAGING','Packaging',80,NOW()),
(gen_random_uuid(),'INSURANCE','Insurance',90,NOW()),(gen_random_uuid(),'WAITING_TIME','Waiting time',100,NOW()),
(gen_random_uuid(),'VEHICLE_RENTAL','Vehicle rental',110,NOW()),(gen_random_uuid(),'LABOUR','Labour',120,NOW()),
(gen_random_uuid(),'DRIVER_ALLOWANCE','Driver allowance',130,NOW()),(gen_random_uuid(),'ACCOMMODATION','Accommodation',140,NOW()),
(gen_random_uuid(),'FAILED_DELIVERY','Failed-delivery fee',150,NOW()),(gen_random_uuid(),'OTHER','Other charge',999,NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Permission" ("id","key","createdAt","updatedAt")
SELECT gen_random_uuid(), key, NOW(), NOW() FROM unnest(ARRAY[
'transport.view','transport.create','transport.edit','transport.quotation.request','transport.quotation.record',
'transport.quotation.compare','transport.approve','transport.assign','transport.collection.confirm',
'transport.delivery.confirm','transport.expense.record','transport.invoice.upload','transport.expense.approve',
'transport.payment.create','transport.payment.confirm','transport.reimbursement.submit',
'transport.reimbursement.approve','transport.cost.allocate','transport.profitability.view',
'transport.documents.download','transport.documents.send','transport.providers.manage',
'transport.settings.manage','transport.reports.view']) key
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "Role" ("id","name","slug","isSystem","createdAt","updatedAt") VALUES
(gen_random_uuid(),'Logistics Manager','logistics-manager',true,NOW(),NOW()),
(gen_random_uuid(),'Driver','driver',true,NOW(),NOW())
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r.id,p.id,'ALLOW',NOW() FROM "Role" r CROSS JOIN "Permission" p
WHERE r.slug='super-administrator' AND p.key LIKE 'transport.%' ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r.id,p.id,'ALLOW',NOW() FROM "Role" r CROSS JOIN "Permission" p
WHERE r.slug='logistics-manager' AND p.key IN ('transport.view','transport.create','transport.edit','transport.quotation.request','transport.quotation.record','transport.quotation.compare','transport.approve','transport.assign','transport.collection.confirm','transport.delivery.confirm','transport.expense.record','transport.invoice.upload','transport.cost.allocate','transport.profitability.view','transport.documents.download','transport.documents.send','transport.providers.manage','transport.settings.manage','transport.reports.view') ON CONFLICT DO NOTHING;
INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r.id,p.id,'ALLOW',NOW() FROM "Role" r CROSS JOIN "Permission" p
WHERE r.slug='driver' AND p.key IN ('transport.view','transport.collection.confirm','transport.delivery.confirm','transport.expense.record','transport.reimbursement.submit','transport.documents.download') ON CONFLICT DO NOTHING;
