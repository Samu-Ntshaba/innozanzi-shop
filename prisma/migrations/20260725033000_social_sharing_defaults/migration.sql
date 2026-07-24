INSERT INTO "MarketingSetting" ("id","key","value","description","createdAt","updatedAt")
VALUES
  ('85000000-0000-4000-8000-000000000001','seo.siteTitle','"Innozanzi | Technology That Moves Business Forward"'::jsonb,'Default title used for search and social sharing.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('85000000-0000-4000-8000-000000000002','seo.description','"Fast technology quotations, expert advice, nationwide delivery, installation and ongoing support for South African businesses."'::jsonb,'Default description used for search and social sharing.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('85000000-0000-4000-8000-000000000003','seo.defaultImage','"/social/innozanzi-share.png"'::jsonb,'Public 1200×630 branded social-sharing image.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('85000000-0000-4000-8000-000000000004','seo.logo','"/brand/innozanzi-shop-logo.png"'::jsonb,'Public Innozanzi logo.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "value"=EXCLUDED."value",
  "description"=EXCLUDED."description",
  "updatedAt"=CURRENT_TIMESTAMP;
