CREATE TYPE "MarketingContentStatus" AS ENUM ('DRAFT','IN_REVIEW','APPROVED','SCHEDULED','PUBLISHED','EXPIRED','ARCHIVED');
CREATE TYPE "RedirectType" AS ENUM ('PERMANENT','TEMPORARY');

CREATE TABLE "MarketingSetting" (
  "id" UUID NOT NULL, "key" TEXT NOT NULL, "value" JSONB NOT NULL, "description" TEXT,
  "updatedById" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingSetting_key_key" ON "MarketingSetting"("key");
CREATE INDEX "MarketingSetting_updatedAt_idx" ON "MarketingSetting"("updatedAt");

CREATE TABLE "SeoRecord" (
  "id" UUID NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "path" TEXT,
  "title" TEXT, "description" TEXT, "canonicalUrl" TEXT, "openGraphTitle" TEXT,
  "openGraphDescription" TEXT, "openGraphImage" TEXT, "twitterTitle" TEXT,
  "twitterDescription" TEXT, "twitterImage" TEXT, "primaryKeyword" TEXT,
  "secondaryKeywords" TEXT[] NOT NULL, "indexable" BOOLEAN NOT NULL DEFAULT true,
  "followLinks" BOOLEAN NOT NULL DEFAULT true, "includeInSitemap" BOOLEAN NOT NULL DEFAULT true,
  "sitemapPriority" DECIMAL(2,1) NOT NULL DEFAULT 0.5, "structuredDataType" TEXT,
  "isTestData" BOOLEAN NOT NULL DEFAULT false, "createdById" UUID, "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeoRecord_entityType_entityId_key" ON "SeoRecord"("entityType","entityId");
CREATE INDEX "SeoRecord_path_idx" ON "SeoRecord"("path");
CREATE INDEX "SeoRecord_indexable_includeInSitemap_idx" ON "SeoRecord"("indexable","includeInSitemap");

CREATE TABLE "RedirectRule" (
  "id" UUID NOT NULL, "sourcePath" TEXT NOT NULL, "targetPath" TEXT NOT NULL,
  "type" "RedirectType" NOT NULL DEFAULT 'PERMANENT', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isAutomatic" BOOLEAN NOT NULL DEFAULT false, "hitCount" INTEGER NOT NULL DEFAULT 0,
  "lastHitAt" TIMESTAMP(3), "createdById" UUID, "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RedirectRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RedirectRule_sourcePath_key" ON "RedirectRule"("sourcePath");
CREATE INDEX "RedirectRule_isActive_sourcePath_idx" ON "RedirectRule"("isActive","sourcePath");

CREATE TABLE "MarketingBlock" (
  "id" UUID NOT NULL, "key" TEXT NOT NULL, "location" TEXT NOT NULL, "type" TEXT NOT NULL,
  "title" TEXT, "content" JSONB NOT NULL, "status" "MarketingContentStatus" NOT NULL DEFAULT 'DRAFT',
  "displayOrder" INTEGER NOT NULL DEFAULT 0, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3), "createdById" UUID, "updatedById" UUID, "approvedById" UUID,
  "isTestData" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MarketingBlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingBlock_key_key" ON "MarketingBlock"("key");
CREATE INDEX "MarketingBlock_location_status_displayOrder_idx" ON "MarketingBlock"("location","status","displayOrder");
CREATE INDEX "MarketingBlock_startsAt_endsAt_idx" ON "MarketingBlock"("startsAt","endsAt");

CREATE TABLE "MarketingBlockVersion" (
  "id" UUID NOT NULL, "marketingBlockId" UUID NOT NULL, "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL, "createdById" UUID, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingBlockVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketingBlockVersion_marketingBlockId_fkey" FOREIGN KEY ("marketingBlockId") REFERENCES "MarketingBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MarketingBlockVersion_marketingBlockId_version_key" ON "MarketingBlockVersion"("marketingBlockId","version");
CREATE INDEX "MarketingBlockVersion_marketingBlockId_createdAt_idx" ON "MarketingBlockVersion"("marketingBlockId","createdAt");

CREATE TABLE "MediaAsset" (
  "id" UUID NOT NULL, "bucket" TEXT NOT NULL, "path" TEXT NOT NULL, "publicUrl" TEXT NOT NULL,
  "title" TEXT, "altText" TEXT NOT NULL, "caption" TEXT, "description" TEXT, "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL, "width" INTEGER, "height" INTEGER, "focalPointX" DECIMAL(5,2),
  "focalPointY" DECIMAL(5,2), "isSocialImage" BOOLEAN NOT NULL DEFAULT false,
  "isTestData" BOOLEAN NOT NULL DEFAULT false, "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_path_key" ON "MediaAsset"("path");
CREATE INDEX "MediaAsset_isSocialImage_createdAt_idx" ON "MediaAsset"("isSocialImage","createdAt");

INSERT INTO "Role" ("id","name","slug","description","isSystem","createdAt","updatedAt")
VALUES (gen_random_uuid(),'Marketing','marketing','Public website, SEO and campaign management',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Permission" ("id","key","description","createdAt","updatedAt")
SELECT gen_random_uuid(), key, 'Marketing and public website permission', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM unnest(ARRAY[
  'marketing.dashboard.view','marketing.seo.view','marketing.seo.edit','marketing.seo.publish',
  'marketing.content.view','marketing.content.edit','marketing.content.publish','marketing.content.delete',
  'marketing.media.manage','marketing.redirects.manage','marketing.analytics.view'
]) AS key ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId","permissionId","effect","createdAt")
SELECT r.id,p.id,'ALLOW',CURRENT_TIMESTAMP FROM "Role" r CROSS JOIN "Permission" p
WHERE r.slug IN ('super-administrator','marketing')
AND p.key LIKE 'marketing.%'
ON CONFLICT ("roleId","permissionId") DO NOTHING;
