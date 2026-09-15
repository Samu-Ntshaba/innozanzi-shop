ALTER TYPE "ShipmentStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';

ALTER TABLE "OrderProcurement"
  ADD COLUMN "expectedDispatchAt" TIMESTAMP(3),
  ADD COLUMN "expectedDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "deliveryWindow" TEXT;

ALTER TABLE "Shipment"
  ADD COLUMN "procurementId" UUID;

CREATE INDEX "Shipment_procurementId_status_idx" ON "Shipment"("procurementId", "status");

ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_procurementId_fkey"
  FOREIGN KEY ("procurementId") REFERENCES "OrderProcurement"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
