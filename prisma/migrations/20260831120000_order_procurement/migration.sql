CREATE TABLE "OrderProcurement" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "supplierId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "requestNumber" TEXT NOT NULL,
  "supplierReference" TEXT,
  "supplierInvoiceNumber" TEXT,
  "supplierInvoiceTotal" DECIMAL(19,4),
  "expectedArrivalAt" TIMESTAMP(3),
  "orderedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderProcurement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderProcurement_requestNumber_key" ON "OrderProcurement"("requestNumber");
CREATE UNIQUE INDEX "OrderProcurement_orderId_supplierId_key" ON "OrderProcurement"("orderId", "supplierId");
CREATE INDEX "OrderProcurement_status_expectedArrivalAt_idx" ON "OrderProcurement"("status", "expectedArrivalAt");
CREATE INDEX "OrderProcurement_supplierId_createdAt_idx" ON "OrderProcurement"("supplierId", "createdAt");
ALTER TABLE "OrderProcurement" ADD CONSTRAINT "OrderProcurement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderProcurement" ADD CONSTRAINT "OrderProcurement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "createdAt", "updatedAt")
SELECT DISTINCT rp."roleId", 'ORDER_PAID', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RolePermission" rp
JOIN "Permission" p ON p."id" = rp."permissionId"
WHERE p."key" IN ('orders.view', 'orders.update')
ON CONFLICT ("roleId", "eventKey") DO NOTHING;
