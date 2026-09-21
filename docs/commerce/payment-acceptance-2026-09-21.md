# Payment and order acceptance — 21 September 2026

## Release decision

**Automated application checks pass, but live provider acceptance is not yet signed off.** The read-only production audit currently reports two real hosted-payment attempts older than 30 minutes. Provider reconciliation checked three eligible attempts in job `78c7f7fb-7d36-4347-968f-73f2b896b0f8`, confirmed none and left all three unresolved. These records remain visible in Orders and Admin Payments; they were not silently failed or deleted.

Do not describe the payment system as fully live-accepted until the two real attempts are reconciled and the provider/scheduler checks below are witnessed after this release is deployed.

## Configuration evidence

Checked locally against the production-configured environment, with secrets and merchant identifiers redacted:

| Control | Evidence |
| --- | --- |
| Canonical origin | `https://shop.innozanzi.co.za` |
| Ozow | enabled; production mode (`OZOW_TEST_MODE=false`); site/private/API credentials configured |
| PayFast | enabled; production mode (`PAYFAST_SANDBOX=false`); merchant/key/passphrase configured |
| Test deployment override | disabled (`TEST_MODE_ENVIRONMENT=false`) |
| Ozow notify URL | `https://shop.innozanzi.co.za/api/webhooks/ozow` |
| PayFast notify URL | `https://shop.innozanzi.co.za/api/webhooks/payfast` |
| Recovery authentication | `CRON_SECRET` configured |
| Email provider | Mailtrap API credential configured; no failed email rows in the 21 September audit |
| Recovery schedule | repository config `railway.payment-email-cron.json`: every 10 minutes UTC |

The repository configuration does not prove that the Railway cron service exists or last ran successfully. Confirm that separately in Railway after deployment.

## Automated evidence

- TypeScript: passed (`npx tsc --noEmit`).
- Tests: 100 files and 380 tests passed (`npm test`).
- Lint: passed with zero errors and four existing warnings.
- Next.js 16.3.4 production webpack build: passed. Static generation logged recoverable database-connectivity warnings in the local build sandbox; compilation, type checking, page generation and trace collection completed.
- Both gateway adapters converge on one locked finalizer with event uniqueness, amount/reference/currency checks, inventory reservation, cart conversion, durable communication, audit history and automatic-processing behavior.
- Ozow contract tests cover title-case `IsTest`, mixed-case hashes, two-decimal amount hashing, current object and historical array lookup responses, and ambiguous transaction rejection.
- Return-race tests prove browser query parameters are not payment evidence and verified provider recovery is idempotent.
- Order journey tests cover PayFast and Ozow, supplier placement/confirmation, tracking, multi-supplier aggregation, legacy warehouse states, delivery and completion.

## Production data audit

`npx tsx scripts/audit-commerce-launch.ts` on 21 September 2026 reported:

- active pricing configuration: present;
- PayFast and Ozow configuration checks: enabled;
- real pending hosted payments older than 30 minutes: **2 — release blocker**;
- test-data pending hosted payments older than 30 minutes: 11, reported separately;
- paid but unfinalized: 0;
- failed verified-payment recovery jobs: 0;
- pending/failed paid-order communication jobs: 0/0;
- duplicate inventory reservations: 0;
- paid orders without an active invoice: 0;
- failed emails: 0;
- current Syntech and Pinnacle enabled feed records were fresh within the configured pricing window.

The audit exits with status 2 while release blockers exist.

## Required post-deploy provider matrix

Run in an isolated provider test deployment first, then record transaction/order identifiers and timestamps without storing secrets or signed payloads:

| Scenario | Ozow | PayFast |
| --- | --- | --- |
| Successful payment creates one paid order | Outstanding | Outstanding |
| Cancellation leaves order unpaid and traceable | Outstanding | Outstanding |
| Repeated/delayed notification remains idempotent | Automated pass; provider observation outstanding | Automated pass; provider observation outstanding |
| Return arrives before webhook | Automated pass; provider observation outstanding | Automated pass; provider observation outstanding |
| Tampered signature/amount is rejected | Automated pass; provider observation outstanding | Automated pass; provider observation outstanding |
| Confirmation and Processing emails recorded once | Automated pass; inbox/provider observation outstanding | Automated pass; inbox/provider observation outstanding |
| Cart converts and a new active cart is available | Automated pass; browser observation outstanding | Automated pass; browser observation outstanding |
| Order operates through distributor delivery to Completed | Automated pass; manual production observation outstanding | Automated pass; manual production observation outstanding |

## Live minimum-value acceptance

No new real charge was initiated by this implementation. A live charge requires explicit authorization for that exact charge and designated test product. Do not refund automatically. For each authorized transaction, retain the application order/payment IDs, provider transaction ID, gateway dashboard result, webhook diagnostic, inventory movement, cart state, email outbox state and final order timeline.

Release sign-off requires all of the following:

1. reconcile the two real stale attempts using provider evidence;
2. deploy this code and confirm both public notify URLs in the provider dashboards;
3. confirm the Railway payment/email cron exists and has a successful post-deploy run;
4. complete the isolated-provider matrix;
5. with explicit per-charge authorization, complete one minimum-value live transaction per enabled gateway;
6. rerun the launch audit and obtain `ready: true` with exit status 0.
