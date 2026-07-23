CREATE TYPE "BusinessDocumentType" AS ENUM ('QUOTATION', 'INVOICE', 'DELIVERY_NOTE', 'RFQ', 'ORDER');
CREATE TYPE "BusinessDocumentState" AS ENUM ('DRAFT', 'ISSUED', 'VOID');
CREATE TYPE "DocumentDeliveryStatus" AS ENUM ('PREPARING', 'SENT', 'FAILED');

CREATE TABLE "BusinessDocument" (
  "id" UUID NOT NULL,
  "type" "BusinessDocumentType" NOT NULL,
  "recordId" UUID NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "state" "BusinessDocumentState" NOT NULL DEFAULT 'DRAFT',
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
  "content" BYTEA NOT NULL,
  "size" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "issuedAt" TIMESTAMP(3),
  "generatedById" UUID,
  "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentDispatch" (
  "id" UUID NOT NULL,
  "businessDocumentId" UUID NOT NULL,
  "sentById" UUID,
  "toRecipients" TEXT[],
  "ccRecipients" TEXT[],
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "attachmentNames" TEXT[],
  "status" "DocumentDeliveryStatus" NOT NULL DEFAULT 'PREPARING',
  "providerMessageId" TEXT,
  "providerResponse" TEXT,
  "failureReason" TEXT,
  "sentAt" TIMESTAMP(3),
  "isResend" BOOLEAN NOT NULL DEFAULT false,
  "isTestData" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentBrandingSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedById" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentBrandingSetting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "BusinessDocument_type_recordId_version_key" ON "BusinessDocument"("type", "recordId", "version");
CREATE INDEX "BusinessDocument_type_documentNumber_idx" ON "BusinessDocument"("type", "documentNumber");
CREATE INDEX "BusinessDocument_recordId_createdAt_idx" ON "BusinessDocument"("recordId", "createdAt");
CREATE INDEX "DocumentDispatch_businessDocumentId_createdAt_idx" ON "DocumentDispatch"("businessDocumentId", "createdAt");
CREATE INDEX "DocumentDispatch_status_createdAt_idx" ON "DocumentDispatch"("status", "createdAt");

ALTER TABLE "BusinessDocument" ADD CONSTRAINT "BusinessDocument_generatedById_fkey"
  FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentDispatch" ADD CONSTRAINT "DocumentDispatch_businessDocumentId_fkey"
  FOREIGN KEY ("businessDocumentId") REFERENCES "BusinessDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentDispatch" ADD CONSTRAINT "DocumentDispatch_sentById_fkey"
  FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Permission" ("id","key","createdAt","updatedAt")
SELECT gen_random_uuid(), key, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
  ('documents.download'), ('documents.send'), ('documents.history.view'),
  ('documents.resend'), ('documents.bulk.download'), ('documents.templates.manage')
) AS requested(key)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r."id", p."id", 'ALLOW', CURRENT_TIMESTAMP
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."slug" = 'super-administrator' AND p."key" LIKE 'documents.%'
ON CONFLICT ("roleId","permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r."id", p."id", 'ALLOW', CURRENT_TIMESTAMP
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."slug" IN ('administrator','sales','finance','procurement-officer')
  AND p."key" IN ('documents.download','documents.send','documents.history.view','documents.resend')
ON CONFLICT ("roleId","permissionId") DO NOTHING;
