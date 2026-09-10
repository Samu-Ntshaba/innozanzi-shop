INSERT INTO "Role" ("id", "name", "slug", "description", "isSystem", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Product Tester', 'product-tester', 'May view and purchase private testing products without receiving administrative access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isSystem" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
