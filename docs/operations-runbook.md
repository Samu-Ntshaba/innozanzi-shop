# Operations and restore runbook

## Health and incidents

Monitor `/api/health` and Railway deployment/runtime logs. A `503` means the application cannot query PostgreSQL. Check the linked database service, `DATABASE_URL`, connection limits, and the latest deployment before restarting anything.

## Database restore

1. Put checkout and admin writes into maintenance mode.
2. Create a fresh backup of the affected database before changing it.
3. Restore the selected Railway PostgreSQL backup into a separate database and validate row counts and critical orders.
4. Point a staging deployment at the restored database and run smoke tests.
5. Schedule the production cutover, update `DATABASE_URL`, deploy, and verify `/api/health` plus critical journeys.
6. Keep the previous database unchanged until reconciliation is complete.

## Deployment rollback

Redeploy the last known-good Railway deployment. Schema changes must remain backward compatible; if they are not, restore the matching database backup. Never run `prisma migrate reset` in production.

Whenever a Prisma migration is added, also advance `PRISMA_SCHEMA_VERSION` in
`src/lib/prisma.ts`. This source-level key forces Next.js and Railway to rebuild
the server bundle with the newly generated Prisma runtime. Do not merge a
migration without updating the key.

## Routine checks

Review failed payments/webhooks, email outbox failures, audit activity, low stock, quotation backlog, backup status, response latency, and expiring provider credentials.

The Syntech catalogue is an authenticated JSON supplier feed, not a live product API. A dedicated Railway cron service created from `railway.supplier-cron.json` performs an incremental price-and-stock refresh daily at 04:00 SAST. Check Admin → Supplier feed management each morning: the latest run must be successful and less than 26 hours old. Run a monitored `npm run automation:suppliers -- --full` maintenance refresh when Syntech's full endpoint is responsive to reconcile new and discontinued products. A failed or stale run means storefront prices and availability may be outdated; investigate the feed credentials or supplier response before promoting products.

Admin → Ticketing centre is the operational source of truth for customer
support. Web requests are routed by category to Sales & Quotations, Order
Operations, Finance, Technical Support or Customer Care. Staff must also
capture phone, email, WhatsApp, walk-in and internal requests from the same
screen. Department members, `support@innozanzi.co.za` and super administrators
are notified. Assign every active ticket an owner and due date, create the
required to-dos, keep supplier/private context in internal notes, and use
customer messages for updates that must be emailed and shown in the account
timeline. Customers can reply inside the existing account ticket.
Admin → Operations calendar combines ticket and task deadlines with quotation
expiry, invoice due dates, expected distributor deliveries, RFQ closings and
partnership commitments.

Admin → Orders is the single paid-order operations workspace. Innozanzi does
not receive, warehouse, pack or deliver products. Open an order, assign each
item to its distributor shipment group, record the supplier SKU/reference,
supplier order/reference, cost, confirmation and expected dates, and then
record the distributor's courier and tracking details. Publish only the next
permitted distributor-direct status. The visual lifecycle and event timeline
are shared with the ownership-protected customer tracking page; meaningful
customer milestones are sent once. Historical warehouse statuses remain
readable but are not part of the active workflow.

Procurement officers use Admin → Quotations → Create manual quotation for
off-platform enquiries. Save the quotation before review so it receives a
number and audit trail. Use the origin filter to separate customer requests
from staff-created quotations. After acceptance or verified payment, generate
the invoice under Admin → Invoices. Order Operations records distributor
confirmation, expected delivery, courier and tracking details inside the order;
this sends the appropriate customer milestone and places the commitment on the
calendar.

All email types—not only campaigns—appear under Admin → Email marketing → System email delivery. A retry reuses the same idempotency key. Investigate Mailtrap sending-domain, suppression and bounce status before repeated retries.

Order cancellation is permitted only before dispatch. The operator must confirm the refund; the transaction then marks paid records refunded, releases each inventory reservation, writes movements/history/audit and cancels the converted quotation. If inventory consistency blocks cancellation, reconcile the ledger instead of bypassing the guard.

Run `POST /api/cron/expire-quotations` daily with `Authorization: Bearer <CRON_SECRET>`. Finance must compare proof amount/reference with the final quotation and bank records before verification. A stock exception blocks verification and order creation; resolve availability or regenerate the quotation rather than bypassing the transaction.
