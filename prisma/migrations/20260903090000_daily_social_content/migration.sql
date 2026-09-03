CREATE TABLE "SocialContent" (
  "id" UUID NOT NULL,
  "contentDate" DATE NOT NULL,
  "contentType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "imageAlt" TEXT NOT NULL,
  "destinationUrl" TEXT,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "fingerprint" TEXT NOT NULL,
  "generationKey" TEXT NOT NULL,
  "emailStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "emailedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialContent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SocialContent_fingerprint_key" ON "SocialContent"("fingerprint");
CREATE UNIQUE INDEX "SocialContent_generationKey_key" ON "SocialContent"("generationKey");
CREATE INDEX "SocialContent_contentDate_contentType_idx" ON "SocialContent"("contentDate", "contentType");
CREATE INDEX "SocialContent_sourceType_sourceId_idx" ON "SocialContent"("sourceType", "sourceId");
CREATE INDEX "SocialContent_createdAt_idx" ON "SocialContent"("createdAt");
