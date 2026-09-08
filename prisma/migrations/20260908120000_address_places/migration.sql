ALTER TABLE "Address" ADD COLUMN "googlePlaceId" TEXT;
ALTER TABLE "PaymentSubmission" ADD COLUMN "deliveryAddress" JSONB;
