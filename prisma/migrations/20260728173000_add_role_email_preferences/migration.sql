CREATE TABLE "RoleEmailPreference" (
    "roleId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoleEmailPreference_pkey" PRIMARY KEY ("roleId", "eventKey")
);

CREATE INDEX "RoleEmailPreference_eventKey_enabled_idx" ON "RoleEmailPreference"("eventKey", "enabled");
ALTER TABLE "RoleEmailPreference" ADD CONSTRAINT "RoleEmailPreference_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "updatedAt")
SELECT "id", event_key, true, CURRENT_TIMESTAMP
FROM "Role"
CROSS JOIN (VALUES
  ('USER_CREATED'),
  ('USER_ACTIVATED'),
  ('QUOTATION_REQUESTED'),
  ('HELP_DESK_CREATED'),
  ('HELP_DESK_CUSTOMER_REPLY'),
  ('PAYMENT_REVIEW_REQUIRED'),
  ('PARTNERSHIP_APPLICATION'),
  ('RETURN_REQUESTED')
) AS events(event_key)
WHERE "slug" = 'super-administrator';

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "updatedAt")
SELECT "id", event_key, true, CURRENT_TIMESTAMP
FROM "Role"
CROSS JOIN (VALUES ('QUOTATION_REQUESTED')) AS events(event_key)
WHERE "slug" IN ('sales', 'procurement-officer');

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "updatedAt")
SELECT "id", event_key, true, CURRENT_TIMESTAMP
FROM "Role"
CROSS JOIN (VALUES ('HELP_DESK_CREATED'), ('HELP_DESK_CUSTOMER_REPLY')) AS events(event_key)
WHERE "slug" = 'support-agent';

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "updatedAt")
SELECT "id", event_key, true, CURRENT_TIMESTAMP
FROM "Role"
CROSS JOIN (VALUES ('PAYMENT_REVIEW_REQUIRED')) AS events(event_key)
WHERE "slug" = 'finance';

INSERT INTO "RoleEmailPreference" ("roleId", "eventKey", "enabled", "updatedAt")
SELECT "id", event_key, true, CURRENT_TIMESTAMP
FROM "Role"
CROSS JOIN (VALUES ('RETURN_REQUESTED')) AS events(event_key)
WHERE "slug" = 'returns-manager';
