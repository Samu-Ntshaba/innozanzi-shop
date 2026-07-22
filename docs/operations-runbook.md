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

## Routine checks

Review failed payments/webhooks, email outbox failures, audit activity, low stock, quotation backlog, backup status, response latency, and expiring provider credentials.
