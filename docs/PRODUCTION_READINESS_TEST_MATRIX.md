# Production Readiness Test Matrix

Date: 2026-09-16
Scope: deployed Innozanzi commerce application and distributor-direct Order Operations
Safety boundary: no real charges, refunds, supplier orders, customer email, destructive production writes, uncontrolled AI calls, or production load.

`PASS` means the recorded check ran and met its expectation. `PARTIAL` means useful evidence exists but a production-equivalent journey was not completed. `BLOCKED` records the missing safe environment or authority. Results must be read with the detailed release report.

| ID | Test | Expected result | Actual result | Status | Severity | Evidence / fix / retest |
|---|---|---|---|---|---|---|
| PR-01 | Build and type-check | Production bundle and TypeScript compile | Type-check and supported Webpack production build pass | PASS | P1 | `npx tsc --noEmit`; `next build --webpack`. Turbopack cannot bind its internal sandbox port (`Operation not permitted`), an environment limitation rather than an application compile error. |
| PR-02 | Lint/static quality | No lint errors | Zero errors; four pre-existing warnings classified | PASS | P2 | `npm run lint` |
| PR-03 | Automated regression | All suites pass | 95 files, 344 tests pass | PASS | P1 | `npm test`; includes Order Operations and governed Pricing & Trading regressions |
| PR-04 | Schema/migrations | Valid, additive, deployable from current production | Schema validates; additive migration is pending on production | PARTIAL | P1 | `prisma validate`; `prisma migrate status`. Fixed stale `PRISMA_SCHEMA_VERSION` and retested. Deployment must apply migration. |
| PR-05 | Authentication | Auth/reset/session boundaries enforced | Automated registration, password reset, session and permission tests pass; no browser session-expiry matrix | PARTIAL | P1 | Auth/security test suites; browser/UAT remains |
| PR-06 | Customer IDOR | Cross-customer records denied | Ownership checks for orders, invoices and documents pass automated tests | PASS | P0 | Document/order security suites and server-side ownership guards |
| PR-07 | Catalogue/search/product | Sellable products render safely without cost leakage | Public homepage, shop, categories, search suggestion and sampled supplier product return 200; automated catalogue tests pass | PASS | P1 | Production GET smoke; catalogue suites |
| PR-08 | Supplier ingestion/freshness | Bad feeds fail safely; freshness visible | Parser/failure tests pass; active Syntech and Pinnacle runs are current; inactive legacy Syntech feed is stale | PASS | P1 | Production audit: active feeds last succeeded 2026-09-15; 4,439 active offers, 0 stale |
| PR-09 | Pricing/floor/margin | Correct arithmetic and no unsafe publication | Pricing/floor/transaction tests pass; production audit found 0 missing costs and 0 floor exceptions among eligible offers | PASS | P0 | Pricing suites and `audit-commerce-launch.ts` |
| PR-10 | Trading/market intelligence | Evidence-backed persistent market comparisons and resumable scans | Persistent exact-match observations, confidence benchmarks, leased jobs, sessions, recommendations, overrides and audit screens are implemented; live OpenAI scan acceptance remains pending | PARTIAL | P1 | Deterministic analysis tests pass; migration/deployment and controlled live scan remain |
| PR-11 | AI safety/failure isolation | AI cannot control money or break commerce | Automated safety, scope, rate and failure tests pass; no controlled live-provider UAT/cost run | PARTIAL | P1 | AI suites; live calls intentionally excluded |
| PR-12 | Cart/coupons/checkout/address | Authoritative totals and validated inputs | Server recalculation, coupon, quantity and signed-address tests pass | PASS | P0 | Checkout/cart/pricing suites |
| PR-13 | Gateway security/idempotency | Server-verified, replay-safe payment truth | Signature, amount, replay and idempotency tests pass; enabled gateway sandbox journeys not available | PARTIAL | P0 | Payment suites; PayFast/Ozow production configuration enabled |
| PR-14 | Payment-to-order integration | One paid order/invoice/confirmation | Transaction and replay tests pass; 12 old hosted attempts remain pending (2 non-test) | FAIL | P1 | Production read-only audit; Finance reconciliation required |
| PR-15 | Order state machine | Paid order reaches completed without warehouse stages | New active path and invalid-transition tests pass | PASS | P0 | PAYMENT_VERIFIED → PROCESSING → SOURCING_ITEMS → DISPATCHED → IN_TRANSIT → DELIVERED → COMPLETED |
| PR-16 | Multi-supplier fulfilment | One order with isolated supplier groups and safe aggregation | Group CRUD, tracking and aggregate lifecycle tests pass | PASS | P0 | Order Operations integration/unit suites |
| PR-17 | Customer email/outbox | Idempotent milestones; observable failure | Outbox/retry/idempotency tests pass; production reports 0 failed and 0 pending paid-order communication | PASS | P1 | Email suites and production audit |
| PR-18 | Invoice/financial reconciliation | Order/payment/invoice values reconcile | Invariants and invoice tests pass; no controlled gateway settlement sample was available | PARTIAL | P0 | Automated financial suites; settlement UAT remains |
| PR-19 | Admin Orders workspace | Full operation without separate logistics subsystem | Desktop order now contains supplier setup, confirmation, documents, tracking, notes, exceptions and status actions | PASS | P1 | Component/permission/lifecycle tests and production build |
| PR-20 | Mobile Admin | Full paid-to-completed operation from order detail | Mobile list/detail/actions implemented and tested statically; physical-device PWA UAT not run | PARTIAL | P1 | Build and navigation tests; device UAT remains |
| PR-21 | Admin RBAC/audit | Every sensitive mutation authorises and audits | Permission and mutation tests pass; no live multi-role browser matrix | PARTIAL | P0 | RBAC/audit automated suites |
| PR-22 | Secret exposure | No secrets in source or client build | No tracked secret files, client secret-env imports, or secret-like built assets found | PASS | P0 | Repository and `.next/static` scans (values never printed) |
| PR-23 | Web security/fuzzing | Malformed/hostile input fails safely | Automated CSRF, XSS escaping, upload, redirect, validation and IDOR tests pass; no external penetration test | PARTIAL | P0 | Security suites and non-destructive boundary checks |
| PR-24 | Rate limiting | Sensitive endpoints limited per real client | Controls are tested, but production lacks `TRUSTED_CLIENT_IP_HEADER`, so requests share conservative `unknown` identity | FAIL | P1 | Environment status-only audit; configure trusted ingress header |
| PR-25 | Dependency failure | Optional provider failures preserve commerce truth | Payment/email/supplier/AI failure tests pass | PASS | P1 | Integration failure suites |
| PR-26 | Jobs/restart | Idempotent jobs resume without duplicates | Job idempotency tests pass; worker-stop/restart and deploy interruption not run in staging | PARTIAL | P1 | Automated job suites; staging exercise required |
| PR-27 | Observability/errors | Critical failure traceable without sensitive output | Health and audit/error tests pass; end-to-end correlation trace not demonstrated | PARTIAL | P1 | `/api/health` 200; automated logging/error checks |
| PR-28 | Accessibility/responsive/browser | Core journeys usable across supported targets | Static semantics/components covered; real Chrome/Safari/Edge/Firefox/mobile run unavailable | BLOCKED | P2 | Requires browser/device matrix |
| PR-29 | Performance baseline | Safe critical-route latency recorded | Public routes measured at 226–531 ms; suggestion API 318 ms; sampled product 311 ms | PASS | P2 | Non-destructive production GETs; no errors |
| PR-30 | Load/concurrency/soak/spike | Safe representative staging load passes | No production-equivalent isolated environment or telemetry supplied | BLOCKED | P1 | Production load intentionally prohibited |
| PR-31 | Growth/indexing | Bounded lists and indexed critical tables | Core order list bounded at 100 and critical tables indexed; several secondary admin lists remain unpaginated | PARTIAL | P2 | Query/index review; growth remediation backlog |
| PR-32 | Backup/restore | Restorable backup demonstrated | Runbook exists; actual isolated restore evidence unavailable | BLOCKED | P1 | Restore drill and named owner/retention evidence required |
| PR-33 | Production config | Required variables/modes valid | Core DB, gateway, email, AI and Syntech variables present; trusted IP header missing; Pinnacle env URL empty but DB feed is healthy; mobile push private key missing | FAIL | P1 | Status-only audit, no values printed |
| PR-34 | Production smoke | Public pages and auth boundaries healthy | All tested routes returned 200 or redirected unauthenticated users to sign-in; security headers present | PASS | P1 | Homepage, shop, categories, cart, checkout, login, account orders, admin orders, health |
| PR-35 | Golden commerce journey | All views agree through real sandbox payment and completion | Automated cross-layer journey passes, but no safe staging gateway/email/supplier UAT was available | BLOCKED | P0 | Must run controlled sandbox golden order before release |

## Fix-and-retest record

The new migration initially did not advance the source-level Prisma runtime cache marker. A regression test reproduced the mismatch. `PRISMA_SCHEMA_VERSION` was advanced to `2026-09-16-distributor-order-operations`; the targeted suite then passed (5/5), followed by the full regression and build gates.

## Unresolved release blockers

1. Apply and verify the additive production migration during deployment.
2. Finance must reconcile the two non-test hosted payment attempts older than 30 minutes (plus ten test attempts).
3. Configure and validate `TRUSTED_CLIENT_IP_HEADER` at the trusted reverse proxy.
4. Execute enabled PayFast and Ozow sandbox golden journeys, including callback replay and email/order/invoice reconciliation.
5. Execute a safe staging load/concurrency/soak run and an isolated database restore drill.
