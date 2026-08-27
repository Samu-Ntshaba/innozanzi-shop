ALTER TABLE "ComboCampaignSetting"
  ALTER COLUMN "automationEnabled" SET DEFAULT true,
  ALTER COLUMN "minimumProfitMargin" SET DEFAULT 5,
  ALTER COLUMN "dailyEnabled" SET DEFAULT true,
  ALTER COLUMN "automaticPublication" SET DEFAULT true,
  ALTER COLUMN "automaticSlider" SET DEFAULT true,
  ALTER COLUMN "targetProfitMargin" SET DEFAULT 5;

UPDATE "ComboCampaignSetting"
SET "automationEnabled" = true,
    "minimumProfitMargin" = GREATEST("minimumProfitMargin", 5),
    "dailyEnabled" = true,
    "automaticPublication" = true,
    "automaticSlider" = true,
    "targetProfitMargin" = 5
WHERE "id" = 'default';
