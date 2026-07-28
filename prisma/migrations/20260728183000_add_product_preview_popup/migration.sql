WITH inserted AS (
  INSERT INTO "MarketingBlock" (
    "id",
    "key",
    "location",
    "type",
    "title",
    "content",
    "status",
    "displayOrder",
    "publishedAt",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    gen_random_uuid(),
    'product-preview-not-live',
    'POPUP',
    'POPUP',
    'Product catalogue preview notice',
    jsonb_build_object(
      'heading', 'Products are not live yet',
      'body', 'This product is currently shown as a preview while we complete our reseller onboarding and confirm live availability with Syntech. You may review the product information, but ordering will open only after distributor approval is complete.',
      'buttonLabel', NULL,
      'buttonLink', NULL,
      'audience', 'ALL',
      'pathMode', 'INCLUDE',
      'paths', jsonb_build_array('/products'),
      'frequency', 'EVERY_VISIT',
      'tone', 'NOTICE',
      'dismissible', true
    ),
    'PUBLISHED',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("key") DO UPDATE SET
    "title" = EXCLUDED."title",
    "content" = EXCLUDED."content",
    "status" = 'PUBLISHED',
    "displayOrder" = 0,
    "publishedAt" = COALESCE("MarketingBlock"."publishedAt", CURRENT_TIMESTAMP),
    "updatedAt" = CURRENT_TIMESTAMP
  RETURNING "id", "content", "status", "displayOrder"
)
INSERT INTO "MarketingBlockVersion" (
  "id",
  "marketingBlockId",
  "version",
  "snapshot",
  "createdAt"
)
SELECT
  gen_random_uuid(),
  inserted."id",
  COALESCE((SELECT MAX(version) + 1 FROM "MarketingBlockVersion" WHERE "marketingBlockId" = inserted."id"), 1),
  jsonb_build_object(
    'content', inserted."content",
    'status', inserted."status",
    'displayOrder', inserted."displayOrder"
  ),
  CURRENT_TIMESTAMP
FROM inserted;
