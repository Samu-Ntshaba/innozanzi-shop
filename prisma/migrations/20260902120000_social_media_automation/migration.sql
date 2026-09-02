CREATE TABLE "SocialCampaign" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "focusType" TEXT NOT NULL,
    "instructions" TEXT,
    "targetProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetFeatureKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channels" TEXT[] DEFAULT ARRAY['LINKEDIN']::TEXT[],
    "postsPerDay" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialDelivery" (
    "id" UUID NOT NULL,
    "campaignId" UUID,
    "stream" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "slotKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fingerprint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "caption" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "error" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SocialCampaign_status_startsAt_endsAt_idx" ON "SocialCampaign"("status", "startsAt", "endsAt");
CREATE INDEX "SocialCampaign_priority_startsAt_idx" ON "SocialCampaign"("priority", "startsAt");
CREATE UNIQUE INDEX "SocialDelivery_stream_channel_slotKey_key" ON "SocialDelivery"("stream", "channel", "slotKey");
CREATE INDEX "SocialDelivery_status_channel_createdAt_idx" ON "SocialDelivery"("status", "channel", "createdAt");
CREATE INDEX "SocialDelivery_fingerprint_createdAt_idx" ON "SocialDelivery"("fingerprint", "createdAt");
CREATE INDEX "SocialDelivery_campaignId_createdAt_idx" ON "SocialDelivery"("campaignId", "createdAt");
ALTER TABLE "SocialDelivery" ADD CONSTRAINT "SocialDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SocialCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
