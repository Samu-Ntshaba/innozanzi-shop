-- Replace the original no-image catalogue dump with a small, clearly labelled
-- preview catalogue. These records demonstrate the shopping experience only;
-- stock and commercial terms remain subject to distributor confirmation.
DELETE FROM "Product"
WHERE "sku" IN (
  'INZ-DELL-LAT3550', 'INZ-HP-PB450', 'INZ-LEN-E14', 'INZ-ASUS-EB',
  'INZ-ACER-A5', 'INZ-DELL-OPT', 'INZ-HP-PTOWER', 'INZ-DELL-M24',
  'INZ-LEN-M27', 'INZ-LOGI-MK540', 'INZ-LOGI-ZONE', 'INZ-APC-1200',
  'INZ-EATON-1600', 'INZ-SYN-PS600', 'INZ-TPL-AX3000', 'INZ-UBI-UAP',
  'INZ-HP-LJPRO', 'INZ-SYN-SSD1T', 'INZ-MS-M365BS', 'INZ-MS-W11PRO'
);

INSERT INTO "Category" ("id","name","slug","description","displayOrder","isActive","createdAt","updatedAt")
VALUES
  ('81000000-0000-4000-8000-000000000001','Laptops','laptops','Business notebooks and mobile workstations.',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('81000000-0000-4000-8000-000000000002','Monitors','monitors','Displays for productive home and office workspaces.',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('81000000-0000-4000-8000-000000000003','Power & UPS','ups-and-power','Backup power and equipment protection.',3,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('81000000-0000-4000-8000-000000000004','Networking','networking','Secure connectivity for growing teams.',4,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "displayOrder" = EXCLUDED."displayOrder",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Brand" ("id","name","slug","description","isActive","createdAt","updatedAt")
VALUES ('82000000-0000-4000-8000-000000000001','Catalogue Preview','catalogue-preview','Illustrative products pending final distributor confirmation.',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Product" (
  "id","categoryId","brandId","name","slug","sku","shortDescription","description",
  "regularPrice","currency","vatStatus","status","stockStatus","warranty","deliveryEstimate",
  "isFeatured","isNew","isPopular","publishedAt","isTestData","createdAt","updatedAt"
)
VALUES
  (
    '83000000-0000-4000-8000-000000000001',
    (SELECT "id" FROM "Category" WHERE "slug"='laptops'),
    (SELECT "id" FROM "Brand" WHERE "slug"='catalogue-preview'),
    'Business Laptop — Catalogue Preview','preview-business-laptop','PREVIEW-LAPTOP-01',
    'A preview of how configurable business laptops will appear in our catalogue.',
    'Illustrative product only. Specifications, price, warranty and availability will be confirmed with our authorised distributors before launch.',
    0,'ZAR','TAXABLE','PUBLISHED','PREORDER','To be confirmed','Availability being finalised',
    true,true,true,CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
  ),
  (
    '83000000-0000-4000-8000-000000000002',
    (SELECT "id" FROM "Category" WHERE "slug"='monitors'),
    (SELECT "id" FROM "Brand" WHERE "slug"='catalogue-preview'),
    '27-inch Office Monitor — Catalogue Preview','preview-office-monitor','PREVIEW-MONITOR-01',
    'A preview of how professional displays will be presented and quoted.',
    'Illustrative product only. Specifications, price, warranty and availability will be confirmed with our authorised distributors before launch.',
    0,'ZAR','TAXABLE','PUBLISHED','PREORDER','To be confirmed','Availability being finalised',
    true,true,true,CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
  ),
  (
    '83000000-0000-4000-8000-000000000003',
    (SELECT "id" FROM "Category" WHERE "slug"='ups-and-power'),
    (SELECT "id" FROM "Brand" WHERE "slug"='catalogue-preview'),
    'Office Backup Power — Catalogue Preview','preview-office-backup-power','PREVIEW-POWER-01',
    'A preview of how UPS and business continuity products will be displayed.',
    'Illustrative product only. Capacity, runtime, price, warranty and availability will be confirmed with our authorised distributors before launch.',
    0,'ZAR','TAXABLE','PUBLISHED','PREORDER','To be confirmed','Availability being finalised',
    true,true,true,CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
  ),
  (
    '83000000-0000-4000-8000-000000000004',
    (SELECT "id" FROM "Category" WHERE "slug"='networking'),
    (SELECT "id" FROM "Brand" WHERE "slug"='catalogue-preview'),
    'Wi-Fi 6 Business Router — Catalogue Preview','preview-business-router','PREVIEW-NETWORK-01',
    'A preview of how networking products and solution requests will appear.',
    'Illustrative product only. Specifications, price, warranty and availability will be confirmed with our authorised distributors before launch.',
    0,'ZAR','TAXABLE','PUBLISHED','PREORDER','To be confirmed','Availability being finalised',
    true,true,true,CURRENT_TIMESTAMP,false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
  )
ON CONFLICT ("sku") DO UPDATE SET
  "name"=EXCLUDED."name", "slug"=EXCLUDED."slug", "categoryId"=EXCLUDED."categoryId",
  "brandId"=EXCLUDED."brandId", "shortDescription"=EXCLUDED."shortDescription",
  "description"=EXCLUDED."description", "status"='PUBLISHED', "stockStatus"='PREORDER',
  "deletedAt"=NULL, "isFeatured"=true, "isNew"=true, "isPopular"=true,
  "isTestData"=false, "updatedAt"=CURRENT_TIMESTAMP;

INSERT INTO "ProductImage" ("id","productId","path","altText","width","height","sortOrder","isPrimary","createdAt","updatedAt")
VALUES
  ('84000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','/products/preview/business-laptop.png','Illustrative business laptop catalogue preview',1254,1254,0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('84000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000002','/products/preview/office-monitor.png','Illustrative office monitor catalogue preview',1254,1254,0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('84000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000003','/products/preview/backup-power.png','Illustrative backup power catalogue preview',1254,1254,0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  ('84000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000004','/products/preview/wifi-router.png','Illustrative business router catalogue preview',1254,1254,0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("productId","path") DO UPDATE SET
  "altText"=EXCLUDED."altText", "isPrimary"=true, "updatedAt"=CURRENT_TIMESTAMP;
