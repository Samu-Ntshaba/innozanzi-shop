ALTER TABLE "CustomerProfile"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEBSITE',
  ADD COLUMN "customFields" JSONB;

CREATE TABLE "CrmCustomField" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'TEXT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmCustomField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerNote" (
  "id" UUID NOT NULL,
  "customerProfileId" UUID NOT NULL,
  "authorId" UUID,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CrmCustomField_key_key" ON "CrmCustomField"("key");
CREATE INDEX "CrmCustomField_createdAt_idx" ON "CrmCustomField"("createdAt");
CREATE INDEX "CustomerNote_customerProfileId_createdAt_idx" ON "CustomerNote"("customerProfileId", "createdAt");

ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerProfileId_fkey"
  FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
