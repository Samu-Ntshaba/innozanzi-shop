CREATE TABLE "PushSubscription" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Session_lastSeenAt_idx" ON "Session"("lastSeenAt");

CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_updatedAt_idx" ON "PushSubscription"("userId", "updatedAt");
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "name", "slug", "description", "isSystem", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Mobile Admin', 'mobile-admin', 'Phone-first daily ecommerce operations, customer care, fulfilment, stock and marketing access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "isSystem" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("roleId", "permissionId", "effect", "createdAt")
SELECT role."id", permission."id", 'ALLOW', CURRENT_TIMESTAMP
FROM "Role" role
CROSS JOIN "Permission" permission
WHERE role."slug" = 'mobile-admin'
  AND permission."key" IN (
    'products.view', 'products.update', 'orders.view', 'orders.update', 'payments.approve',
    'quotations.manage', 'customers.manage', 'inventory.manage', 'reports.view',
    'marketing.dashboard.view', 'marketing.content.view', 'marketing.content.edit',
    'marketing.content.publish', 'marketing.media.manage', 'marketing.analytics.view', 'returns.view', 'returns.review',
    'partnership.view', 'partnership.request.view', 'partnership.request.manage',
    'documents.download', 'documents.send', 'documents.history.view',
    'transport.view', 'transport.edit', 'transport.assign',
    'transport.collection.confirm', 'transport.delivery.confirm'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "createdAt", "updatedAt")
SELECT role."id", event."key", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Role" role
CROSS JOIN (VALUES
  ('USER_CREATED'), ('USER_ACTIVATED'), ('ORDER_PLACED'), ('ORDER_PAID'),
  ('QUOTATION_REQUESTED'), ('HELP_DESK_CREATED'), ('HELP_DESK_CUSTOMER_REPLY'),
  ('PAYMENT_REVIEW_REQUIRED'), ('PARTNERSHIP_APPLICATION'), ('RETURN_REQUESTED')
) AS event("key")
WHERE role."slug" = 'mobile-admin'
ON CONFLICT ("roleId", "eventKey") DO UPDATE SET "enabled" = true, "updatedAt" = CURRENT_TIMESTAMP;
