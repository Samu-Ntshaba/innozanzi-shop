-- CreateTable
CREATE TABLE "MarketProduct" (
    "key" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "mpn" TEXT,
    "gtin" TEXT,
    "category" TEXT,
    "variant" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketProduct_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TradingSession" (
    "id" UUID NOT NULL,
    "periodKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scanType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCANNING',
    "rulesSnapshot" JSONB NOT NULL,
    "createdById" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "TradingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketScanJob" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "productKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" UUID,
    "leaseUntil" TIMESTAMP(3),
    "errorCode" TEXT,
    "snapshot" JSONB NOT NULL,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MarketScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketObservation" (
    "id" UUID NOT NULL,
    "productKey" TEXT NOT NULL,
    "jobId" UUID NOT NULL,
    "retailer" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "retailerDomain" TEXT NOT NULL,
    "advertisedPrice" DECIMAL(19,4) NOT NULL,
    "regularPrice" DECIMAL(19,4),
    "promotionPrice" DECIMAL(19,4),
    "promotionDetected" BOOLEAN NOT NULL,
    "promotionType" TEXT,
    "stockState" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "matchEvidence" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBenchmark" (
    "id" UUID NOT NULL,
    "productKey" TEXT NOT NULL,
    "jobId" UUID NOT NULL,
    "normalLow" DECIMAL(19,4),
    "normalMedian" DECIMAL(19,4),
    "normalAverage" DECIMAL(19,4),
    "normalHigh" DECIMAL(19,4),
    "promotionLow" DECIMAL(19,4),
    "sampleSize" INTEGER NOT NULL,
    "confidence" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingDecision" (
    "id" UUID NOT NULL,
    "productKey" TEXT NOT NULL,
    "sessionId" UUID,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "proposedPrice" DECIMAL(19,4),
    "beforePrice" DECIMAL(19,4) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradingDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingPriceOverride" (
    "productKey" TEXT NOT NULL,
    "price" DECIMAL(19,4) NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "version" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingPriceOverride_pkey" PRIMARY KEY ("productKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradingSession_periodKey_key" ON "TradingSession"("periodKey");

-- CreateIndex
CREATE INDEX "TradingSession_startedAt_idx" ON "TradingSession"("startedAt");

-- CreateIndex
CREATE INDEX "MarketScanJob_status_nextAttemptAt_leaseUntil_idx" ON "MarketScanJob"("status", "nextAttemptAt", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "MarketScanJob_sessionId_productKey_key" ON "MarketScanJob"("sessionId", "productKey");

-- CreateIndex
CREATE INDEX "MarketObservation_productKey_observedAt_idx" ON "MarketObservation"("productKey", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketObservation_jobId_sourceUrl_key" ON "MarketObservation"("jobId", "sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "MarketBenchmark_jobId_key" ON "MarketBenchmark"("jobId");

-- CreateIndex
CREATE INDEX "MarketBenchmark_productKey_observedAt_idx" ON "MarketBenchmark"("productKey", "observedAt");

-- CreateIndex
CREATE INDEX "TradingDecision_status_sessionId_idx" ON "TradingDecision"("status", "sessionId");

-- CreateIndex
CREATE INDEX "TradingDecision_productKey_createdAt_idx" ON "TradingDecision"("productKey", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketScanJob" ADD CONSTRAINT "MarketScanJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TradingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketScanJob" ADD CONSTRAINT "MarketScanJob_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "MarketProduct"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketObservation" ADD CONSTRAINT "MarketObservation_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "MarketProduct"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketObservation" ADD CONSTRAINT "MarketObservation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "MarketScanJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketBenchmark" ADD CONSTRAINT "MarketBenchmark_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "MarketProduct"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketBenchmark" ADD CONSTRAINT "MarketBenchmark_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "MarketScanJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingDecision" ADD CONSTRAINT "TradingDecision_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "MarketProduct"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingDecision" ADD CONSTRAINT "TradingDecision_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TradingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingPriceOverride" ADD CONSTRAINT "TradingPriceOverride_productKey_fkey" FOREIGN KEY ("productKey") REFERENCES "MarketProduct"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
