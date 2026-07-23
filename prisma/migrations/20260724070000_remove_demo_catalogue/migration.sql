-- Remove the original demonstration catalogue. These identifiers were reserved
-- exclusively for seeded placeholder products; genuine admin-created products
-- are not affected.
DELETE FROM "CartItem"
WHERE "productId" IN (
  SELECT "id" FROM "Product" WHERE "sku" IN (
    'INZ-DELL-LAT3550', 'INZ-HP-PB450', 'INZ-LEN-E14', 'INZ-ASUS-EB',
    'INZ-ACER-A5', 'INZ-DELL-OPT', 'INZ-HP-PTOWER', 'INZ-DELL-M24',
    'INZ-LEN-M27', 'INZ-LOGI-MK540', 'INZ-LOGI-ZONE', 'INZ-APC-1200',
    'INZ-EATON-1600', 'INZ-SYN-PS600', 'INZ-TPL-AX3000', 'INZ-UBI-UAP',
    'INZ-HP-LJPRO', 'INZ-SYN-SSD1T', 'INZ-MS-M365BS', 'INZ-MS-W11PRO'
  )
);

DELETE FROM "InventoryMovement"
WHERE "inventoryId" IN (
  SELECT i."id"
  FROM "Inventory" i
  JOIN "Product" p ON p."id" = i."productId"
  WHERE p."sku" IN (
    'INZ-DELL-LAT3550', 'INZ-HP-PB450', 'INZ-LEN-E14', 'INZ-ASUS-EB',
    'INZ-ACER-A5', 'INZ-DELL-OPT', 'INZ-HP-PTOWER', 'INZ-DELL-M24',
    'INZ-LEN-M27', 'INZ-LOGI-MK540', 'INZ-LOGI-ZONE', 'INZ-APC-1200',
    'INZ-EATON-1600', 'INZ-SYN-PS600', 'INZ-TPL-AX3000', 'INZ-UBI-UAP',
    'INZ-HP-LJPRO', 'INZ-SYN-SSD1T', 'INZ-MS-M365BS', 'INZ-MS-W11PRO'
  )
);

DELETE FROM "Product"
WHERE "sku" IN (
  'INZ-DELL-LAT3550',
  'INZ-HP-PB450',
  'INZ-LEN-E14',
  'INZ-ASUS-EB',
  'INZ-ACER-A5',
  'INZ-DELL-OPT',
  'INZ-HP-PTOWER',
  'INZ-DELL-M24',
  'INZ-LEN-M27',
  'INZ-LOGI-MK540',
  'INZ-LOGI-ZONE',
  'INZ-APC-1200',
  'INZ-EATON-1600',
  'INZ-SYN-PS600',
  'INZ-TPL-AX3000',
  'INZ-UBI-UAP',
  'INZ-HP-LJPRO',
  'INZ-SYN-SSD1T',
  'INZ-MS-M365BS',
  'INZ-MS-W11PRO'
);
