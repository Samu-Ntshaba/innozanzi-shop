-- Demo products are public previews. They remain visually available in the live
-- catalogue, while commercial actions are restricted to Super Administrators.
UPDATE "Product"
SET "status" = 'DEMO', "isTestData" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "sku" LIKE 'PREVIEW-%';

WITH demo_products(id, category_slug, name, slug, sku, summary, image_path) AS (
  VALUES
    ('83000000-0000-4000-8000-000000000005'::uuid,'laptops','Executive Ultrabook — Demo','demo-executive-ultrabook','DEMO-LAPTOP-02','A lightweight premium notebook preview for mobile teams.','/products/preview/business-laptop.png'),
    ('83000000-0000-4000-8000-000000000006'::uuid,'laptops','Mobile Workstation — Demo','demo-mobile-workstation','DEMO-LAPTOP-03','A performance workstation preview for technical professionals.','/products/preview/business-laptop.png'),
    ('83000000-0000-4000-8000-000000000007'::uuid,'monitors','Dual-Screen Office Display — Demo','demo-dual-office-display','DEMO-MONITOR-02','A productivity display preview for modern workspaces.','/products/preview/office-monitor.png'),
    ('83000000-0000-4000-8000-000000000008'::uuid,'monitors','Conference Room Display — Demo','demo-conference-display','DEMO-MONITOR-03','A large-format meeting-room display preview.','/products/preview/office-monitor.png'),
    ('83000000-0000-4000-8000-000000000009'::uuid,'ups-and-power','Rackmount UPS Solution — Demo','demo-rackmount-ups','DEMO-POWER-02','A managed backup-power preview for server and network equipment.','/products/preview/backup-power.png'),
    ('83000000-0000-4000-8000-000000000010'::uuid,'ups-and-power','Portable Power Station — Demo','demo-portable-power','DEMO-POWER-03','A portable continuity-power preview for flexible teams.','/products/preview/backup-power.png'),
    ('83000000-0000-4000-8000-000000000011'::uuid,'networking','Managed Business Switch — Demo','demo-managed-switch','DEMO-NETWORK-02','A managed switching preview for growing office networks.','/products/preview/wifi-router.png'),
    ('83000000-0000-4000-8000-000000000012'::uuid,'networking','Wi-Fi 6 Access Point — Demo','demo-wifi-access-point','DEMO-NETWORK-03','A scalable wireless access preview for business premises.','/products/preview/wifi-router.png')
)
INSERT INTO "Product" (
  "id","categoryId","brandId","name","slug","sku","shortDescription","description",
  "regularPrice","currency","vatStatus","status","stockStatus","warranty","deliveryEstimate",
  "isFeatured","isNew","isPopular","publishedAt","isTestData","createdAt","updatedAt"
)
SELECT
  d.id, c.id, b.id, d.name, d.slug, d.sku, d.summary,
  'Demo product only. Specifications, pricing, warranty and live availability will be confirmed with distribution partners after reseller onboarding is complete.',
  0,'ZAR','TAXABLE','DEMO','PREORDER','To be confirmed','Demo availability only',
  true,true,true,CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM demo_products d
JOIN "Category" c ON c."slug" = d.category_slug
JOIN "Brand" b ON b."slug" = 'catalogue-preview'
ON CONFLICT ("sku") DO UPDATE SET
  "name"=EXCLUDED."name", "slug"=EXCLUDED."slug", "categoryId"=EXCLUDED."categoryId",
  "brandId"=EXCLUDED."brandId", "shortDescription"=EXCLUDED."shortDescription",
  "description"=EXCLUDED."description", "status"='DEMO', "stockStatus"='PREORDER',
  "deletedAt"=NULL, "isFeatured"=true, "isNew"=true, "isPopular"=true,
  "isTestData"=false, "updatedAt"=CURRENT_TIMESTAMP;

WITH demo_images(id, product_id, path, alt_text) AS (
  VALUES
    ('84000000-0000-4000-8000-000000000005'::uuid,'83000000-0000-4000-8000-000000000005'::uuid,'/products/preview/business-laptop.png','Executive ultrabook demo'),
    ('84000000-0000-4000-8000-000000000006'::uuid,'83000000-0000-4000-8000-000000000006'::uuid,'/products/preview/business-laptop.png','Mobile workstation demo'),
    ('84000000-0000-4000-8000-000000000007'::uuid,'83000000-0000-4000-8000-000000000007'::uuid,'/products/preview/office-monitor.png','Dual office display demo'),
    ('84000000-0000-4000-8000-000000000008'::uuid,'83000000-0000-4000-8000-000000000008'::uuid,'/products/preview/office-monitor.png','Conference display demo'),
    ('84000000-0000-4000-8000-000000000009'::uuid,'83000000-0000-4000-8000-000000000009'::uuid,'/products/preview/backup-power.png','Rackmount UPS demo'),
    ('84000000-0000-4000-8000-000000000010'::uuid,'83000000-0000-4000-8000-000000000010'::uuid,'/products/preview/backup-power.png','Portable power station demo'),
    ('84000000-0000-4000-8000-000000000011'::uuid,'83000000-0000-4000-8000-000000000011'::uuid,'/products/preview/wifi-router.png','Managed switch demo'),
    ('84000000-0000-4000-8000-000000000012'::uuid,'83000000-0000-4000-8000-000000000012'::uuid,'/products/preview/wifi-router.png','Wi-Fi access point demo')
)
INSERT INTO "ProductImage" ("id","productId","path","altText","width","height","sortOrder","isPrimary","createdAt","updatedAt")
SELECT id, product_id, path, alt_text, 1254, 1254, 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM demo_images
ON CONFLICT ("productId","path") DO UPDATE SET "altText"=EXCLUDED."altText", "isPrimary"=true, "updatedAt"=CURRENT_TIMESTAMP;

INSERT INTO "Inventory" ("id","productId","onHand","reserved","incoming","reorderLevel","createdAt","updatedAt")
SELECT
  ('85000000-0000-4000-8000-' || RIGHT(REPLACE(p."id"::text, '-', ''), 12))::uuid,
  p."id", 25, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Product" p
WHERE p."status" = 'DEMO'
  AND NOT EXISTS (SELECT 1 FROM "Inventory" i WHERE i."productId" = p."id" AND i."variantId" IS NULL);
