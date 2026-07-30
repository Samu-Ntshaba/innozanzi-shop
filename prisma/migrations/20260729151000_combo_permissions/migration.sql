-- Provision combo campaign permissions without requiring a production seed run.
INSERT INTO "Permission" ("id", "key", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), permission_key, 'Product Combo Campaigns', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM unnest(ARRAY[
  'combos.view',
  'combos.create',
  'combos.edit',
  'combos.approve',
  'combos.publish',
  'combos.pause',
  'combos.pricing.manage',
  'combos.profit.override',
  'combos.ai.generate',
  'combos.email.manage',
  'combos.slider.manage',
  'combos.reports.view',
  'combos.automation.manage'
]) AS permission_key
ON CONFLICT ("key") DO NOTHING;

-- System administrators receive the complete permission set.
INSERT INTO "RolePermission" ("roleId", "permissionId", "effect", "createdAt")
SELECT role."id", permission."id", 'ALLOW', CURRENT_TIMESTAMP
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."slug" IN ('super-administrator', 'administrator')
  AND permission."key" LIKE 'combos.%'
ON CONFLICT ("roleId", "permissionId")
DO UPDATE SET "effect" = 'ALLOW';

-- Marketing can operate campaigns, but cannot override protected profit rules.
INSERT INTO "RolePermission" ("roleId", "permissionId", "effect", "createdAt")
SELECT role."id", permission."id", 'ALLOW', CURRENT_TIMESTAMP
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."slug" = 'marketing'
  AND permission."key" LIKE 'combos.%'
  AND permission."key" <> 'combos.profit.override'
ON CONFLICT ("roleId", "permissionId")
DO UPDATE SET "effect" = 'ALLOW';
