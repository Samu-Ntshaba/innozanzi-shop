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

All email types—not only campaigns—appear under Admin → Email marketing → System email delivery. A retry reuses the same idempotency key. Investigate Mailtrap sending-domain, suppression and bounce status before repeated retries.

Order cancellation is permitted only before dispatch. The operator must confirm the refund; the transaction then marks paid records refunded, releases each inventory reservation, writes movements/history/audit and cancels the converted quotation. If inventory consistency blocks cancellation, reconcile the ledger instead of bypassing the guard.

Run `POST /api/cron/expire-quotations` daily with `Authorization: Bearer <CRON_SECRET>`. Finance must compare proof amount/reference with the final quotation and bank records before verification. A stock exception blocks verification and order creation; resolve availability or regenerate the quotation rather than bypassing the transaction.
