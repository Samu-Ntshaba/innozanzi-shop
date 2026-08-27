CREATE TABLE "RecommendationEvent" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "sessionId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "category" TEXT,
  "brand" TEXT,
  "searchTerm" TEXT,
  "price" DECIMAL(19,4),
  "specification" JSONB,
  "recommendationId" TEXT,
  "context" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "RecommendationEvent_userId_createdAt_idx" ON "RecommendationEvent"("userId", "createdAt");
CREATE INDEX "RecommendationEvent_sessionId_createdAt_idx" ON "RecommendationEvent"("sessionId", "createdAt");
CREATE INDEX "RecommendationEvent_eventType_createdAt_idx" ON "RecommendationEvent"("eventType", "createdAt");
CREATE INDEX "RecommendationEvent_entityType_entityId_createdAt_idx" ON "RecommendationEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "RecommendationEvent_recommendationId_eventType_idx" ON "RecommendationEvent"("recommendationId", "eventType");
