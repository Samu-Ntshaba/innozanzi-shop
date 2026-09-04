ALTER TABLE "Cart"
  ADD COLUMN "origin" TEXT,
  ADD COLUMN "aiRecommendationId" TEXT,
  ADD COLUMN "aiSummary" JSONB;

ALTER TABLE "Order"
  ADD COLUMN "origin" TEXT,
  ADD COLUMN "aiRecommendationId" TEXT;

CREATE TABLE "AIUsage" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "anonymousSessionId" TEXT,
  "recommendationId" TEXT,
  "feature" TEXT NOT NULL DEFAULT 'SHOPPING_ASSISTANT',
  "model" TEXT,
  "intentType" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(19,8) NOT NULL DEFAULT 0,
  "requestStatus" TEXT NOT NULL,
  "responseTimeMs" INTEGER,
  "cartCreated" BOOLEAN NOT NULL DEFAULT false,
  "pcBuildGenerated" BOOLEAN NOT NULL DEFAULT false,
  "orderId" UUID,
  "errorCode" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AIUsage_recommendationId_key" ON "AIUsage"("recommendationId");
CREATE INDEX "AIUsage_createdAt_requestStatus_idx" ON "AIUsage"("createdAt", "requestStatus");
CREATE INDEX "AIUsage_userId_createdAt_idx" ON "AIUsage"("userId", "createdAt");
CREATE INDEX "AIUsage_anonymousSessionId_createdAt_idx" ON "AIUsage"("anonymousSessionId", "createdAt");
CREATE INDEX "AIUsage_orderId_idx" ON "AIUsage"("orderId");
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
