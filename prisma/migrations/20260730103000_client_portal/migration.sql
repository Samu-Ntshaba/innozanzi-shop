CREATE TABLE "ClientPortal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerProfileId" UUID NOT NULL,
  "primaryUserId" UUID NOT NULL,
  "assignedById" UUID,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "tier" TEXT NOT NULL DEFAULT 'STANDARD',
  "modules" TEXT[] NOT NULL DEFAULT ARRAY['PRODUCTS', 'QUOTATIONS', 'ORDERS', 'DELIVERIES', 'RETURNS', 'SUPPORT', 'DOCUMENTS']::TEXT[],
  "internalNotes" TEXT,
  "invitationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "invitedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientPortal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientPortal_customerProfileId_key" ON "ClientPortal"("customerProfileId");
CREATE UNIQUE INDEX "ClientPortal_primaryUserId_key" ON "ClientPortal"("primaryUserId");
CREATE INDEX "ClientPortal_status_updatedAt_idx" ON "ClientPortal"("status", "updatedAt");
CREATE INDEX "ClientPortal_invitationStatus_invitedAt_idx" ON "ClientPortal"("invitationStatus", "invitedAt");
ALTER TABLE "ClientPortal" ADD CONSTRAINT "ClientPortal_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientPortal" ADD CONSTRAINT "ClientPortal_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientPortal" ADD CONSTRAINT "ClientPortal_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
