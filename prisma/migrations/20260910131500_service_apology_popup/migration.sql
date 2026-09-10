WITH popup AS (
  INSERT INTO "MarketingBlock" (
    "id", "key", "location", "type", "title", "content", "status",
    "displayOrder", "startsAt", "endsAt", "publishedAt", "createdAt", "updatedAt"
  )
  VALUES (
    gen_random_uuid(),
    'service-apology-2026-09-10',
    'POPUP',
    'POPUP',
    'Store availability apology — 10 September 2026',
    jsonb_build_object(
      'heading', 'We’re sorry for today’s interruption',
      'body', 'Our product catalogue was temporarily unavailable earlier today. The issue has been resolved and products are available again. We sincerely apologise for the inconvenience and appreciate your patience.',
      'buttonLabel', NULL,
      'buttonLink', NULL,
      'audience', 'ALL',
      'pathMode', 'ALL',
      'paths', jsonb_build_array(),
      'frequency', 'ONCE_EVER',
      'tone', 'NOTICE',
      'dismissible', true
    ),
    'PUBLISHED',
    0,
    CURRENT_TIMESTAMP,
    TIMESTAMPTZ '2026-09-10 22:00:00+00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("key") DO UPDATE SET
    "title" = EXCLUDED."title",
    "content" = EXCLUDED."content",
    "status" = EXCLUDED."status",
    "displayOrder" = EXCLUDED."displayOrder",
    "startsAt" = EXCLUDED."startsAt",
    "endsAt" = EXCLUDED."endsAt",
    "publishedAt" = COALESCE("MarketingBlock"."publishedAt", EXCLUDED."publishedAt"),
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "id", "content", "status", "displayOrder", "startsAt", "endsAt"
)
INSERT INTO "MarketingBlockVersion" (
  "id", "marketingBlockId", "version", "snapshot", "createdAt"
)
SELECT
  gen_random_uuid(),
  popup."id",
  COALESCE((SELECT MAX("version") + 1 FROM "MarketingBlockVersion" WHERE "marketingBlockId" = popup."id"), 1),
  jsonb_build_object(
    'content', popup."content",
    'status', popup."status",
    'displayOrder', popup."displayOrder",
    'startsAt', popup."startsAt",
    'endsAt', popup."endsAt"
  ),
  CURRENT_TIMESTAMP
FROM popup;
