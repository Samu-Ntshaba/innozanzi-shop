CREATE TYPE "PartnershipAgreementStatus" AS ENUM ('DRAFT','AWAITING_PARTNER_SIGNATURE','AWAITING_INTERNAL_SIGNATURE','ACTIVE','SUPERSEDED','CANCELLED');
CREATE TYPE "PartnershipChangeType" AS ENUM ('AMENDMENT','RENEWAL');

CREATE TABLE "PartnershipAgreement" (
  "id" UUID NOT NULL, "partnershipId" UUID NOT NULL, "agreementNumber" TEXT NOT NULL,
  "status" "PartnershipAgreementStatus" NOT NULL DEFAULT 'DRAFT', "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "effectiveAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "activatedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PartnershipAgreement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnershipAgreement_partnershipId_key" ON "PartnershipAgreement"("partnershipId");
CREATE UNIQUE INDEX "PartnershipAgreement_agreementNumber_key" ON "PartnershipAgreement"("agreementNumber");
CREATE INDEX "PartnershipAgreement_status_expiresAt_idx" ON "PartnershipAgreement"("status","expiresAt");

CREATE TABLE "PartnershipAgreementVersion" (
  "id" UUID NOT NULL, "agreementId" UUID NOT NULL, "version" INTEGER NOT NULL, "title" TEXT NOT NULL,
  "body" TEXT NOT NULL, "termsSnapshot" JSONB, "pdfContent" BYTEA, "pdfFilename" TEXT,
  "issuedAt" TIMESTAMP(3), "createdById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnershipAgreementVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnershipAgreementVersion_agreementId_version_key" ON "PartnershipAgreementVersion"("agreementId","version");
CREATE INDEX "PartnershipAgreementVersion_agreementId_createdAt_idx" ON "PartnershipAgreementVersion"("agreementId","createdAt");

CREATE TABLE "PartnershipAgreementSignature" (
  "id" UUID NOT NULL, "agreementId" UUID NOT NULL, "versionId" UUID NOT NULL, "signerId" UUID NOT NULL,
  "signerRole" TEXT NOT NULL, "legalName" TEXT NOT NULL, "initials" TEXT NOT NULL, "signatureText" TEXT NOT NULL,
  "consentText" TEXT NOT NULL, "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT, "userAgent" TEXT, CONSTRAINT "PartnershipAgreementSignature_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnershipAgreementSignature_versionId_signerRole_key" ON "PartnershipAgreementSignature"("versionId","signerRole");
CREATE INDEX "PartnershipAgreementSignature_agreementId_signedAt_idx" ON "PartnershipAgreementSignature"("agreementId","signedAt");

CREATE TABLE "PartnershipChange" (
  "id" UUID NOT NULL, "partnershipId" UUID NOT NULL, "agreementId" UUID NOT NULL,
  "resultingVersionId" UUID, "type" "PartnershipChangeType" NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "reason" TEXT NOT NULL, "proposedBody" TEXT, "requestedById" UUID NOT NULL, "approvedById" UUID,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "approvedAt" TIMESTAMP(3), "effectiveAt" TIMESTAMP(3),
  "newExpiryAt" TIMESTAMP(3), "offlineSignedDocumentId" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "PartnershipChange_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnershipChange_offlineSignedDocumentId_key" ON "PartnershipChange"("offlineSignedDocumentId");
CREATE INDEX "PartnershipChange_partnershipId_status_idx" ON "PartnershipChange"("partnershipId","status");
CREATE INDEX "PartnershipChange_type_status_idx" ON "PartnershipChange"("type","status");

ALTER TABLE "PartnershipAgreement" ADD CONSTRAINT "PartnershipAgreement_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnershipAgreementVersion" ADD CONSTRAINT "PartnershipAgreementVersion_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "PartnershipAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnershipAgreementVersion" ADD CONSTRAINT "PartnershipAgreementVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnershipAgreementSignature" ADD CONSTRAINT "PartnershipAgreementSignature_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "PartnershipAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnershipAgreementSignature" ADD CONSTRAINT "PartnershipAgreementSignature_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "PartnershipAgreementVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnershipAgreementSignature" ADD CONSTRAINT "PartnershipAgreementSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnershipChange" ADD CONSTRAINT "PartnershipChange_partnershipId_fkey" FOREIGN KEY ("partnershipId") REFERENCES "Partnership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnershipChange" ADD CONSTRAINT "PartnershipChange_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "PartnershipAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnershipChange" ADD CONSTRAINT "PartnershipChange_resultingVersionId_fkey" FOREIGN KEY ("resultingVersionId") REFERENCES "PartnershipAgreementVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnershipChange" ADD CONSTRAINT "PartnershipChange_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PartnershipChange" ADD CONSTRAINT "PartnershipChange_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartnershipChange" ADD CONSTRAINT "PartnershipChange_offlineSignedDocumentId_fkey" FOREIGN KEY ("offlineSignedDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
