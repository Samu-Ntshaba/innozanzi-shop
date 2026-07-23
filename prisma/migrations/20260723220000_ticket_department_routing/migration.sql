ALTER TABLE "HelpDeskTicket"
  ADD COLUMN "departmentId" UUID,
  ADD COLUMN "sourceChannel" TEXT NOT NULL DEFAULT 'WEB';

CREATE INDEX "HelpDeskTicket_departmentId_status_createdAt_idx"
  ON "HelpDeskTicket"("departmentId", "status", "createdAt");

ALTER TABLE "HelpDeskTicket"
  ADD CONSTRAINT "HelpDeskTicket_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Department" ("id", "name", "description", "isActive", "createdAt", "updatedAt") VALUES
  ('10000000-0000-4000-8000-000000000001', 'Sales & Quotations', 'Quotation, product and pre-sales requests', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'Order Operations', 'Orders, fulfilment and delivery', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'Finance', 'Payments, invoices and payment verification', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000004', 'Technical Support', 'Technical assistance, setup and after-sales support', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000005', 'Customer Care', 'Accounts and general customer assistance', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "description" = EXCLUDED."description",
  "isActive" = TRUE,
  "updatedAt" = CURRENT_TIMESTAMP;
