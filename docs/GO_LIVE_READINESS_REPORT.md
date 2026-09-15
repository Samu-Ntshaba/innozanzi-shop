# Go-Live Readiness Report

Date: 2026-09-16
Decision: **NOT READY FOR PRODUCTION**

The distributor-direct Order Operations correction is implemented and passes the automated quality gates. The release cannot honestly be certified while P0/P1 production-equivalent payment, load, restore, and configuration checks remain unresolved.

## Scorecard

| Area | Result | Evidence / reason |
|---|---|---|
| Build | PASS | TypeScript, Prisma validation and supported Webpack production build pass |
| Customer UX | PARTIAL | Public smoke passes; first-time/returning browser UAT unavailable |
| Authentication | PARTIAL | Automated boundaries pass; browser session matrix unavailable |
| Security | PARTIAL | Automated security and artifact scans pass; trusted client-IP configuration and external penetration test remain |
| Catalogue | PASS | Production catalogue/search/product smoke and feed audit pass |
| Suppliers | PASS | Active Syntech/Pinnacle feeds healthy; supplier-order workflow is inside Orders |
| Pricing | PASS | Deterministic floor/margin tests pass; production eligible offers show no missing cost/floor exception |
| Trading | PARTIAL | Evidence-backed sales analytics exist; reconciliation UAT remains |
| Market intelligence | FAIL | Requested persistent matching/confidence/resumable scan system is not implemented |
| Risk | PARTIAL | Automated risk rules pass; full live trigger/false-positive UAT not run |
| OpenAI / AI | PARTIAL | Safety/failure/rate tests pass; controlled live-provider UAT excluded |
| Cart | PASS | Authoritative cart and quantity tests pass |
| Checkout | PASS | Server totals, address signatures and commercial controls pass |
| Payments | FAIL | Automated security passes, but two non-test old pending hosted attempts require reconciliation and sandbox gateway E2E is blocked |
| Orders | PASS | Distributor-direct, multi-supplier paid-to-completed workflow passes |
| Email | PASS | Idempotency/retry tests pass; production has no failed or pending paid-order communication |
| Tracking | PASS | Supplier-group tracking and customer aggregation tests pass |
| Admin | PASS | Orders is the single operational workspace; obsolete navigation removed |
| Mobile Admin | PARTIAL | Complete order detail/actions implemented; device/PWA UAT unavailable |
| Performance | PASS | Safe production GET baseline: 226–531 ms for sampled public routes |
| Load / concurrency | BLOCKED | No safe production-equivalent staging target and telemetry provided |
| Background jobs | PARTIAL | Automated idempotency/failure tests pass; restart/overlap exercise remains |
| Observability | PARTIAL | Health/audit/error evidence exists; full correlation trace remains |
| Backup / recovery | BLOCKED | Documented procedure, no demonstrated isolated restore |
| Production config | FAIL | Trusted client-IP header absent; deployment migration pending; mobile push private key absent |

## Defects fixed and retested

### P1 — Prisma deployment cache marker lagged behind migration

- Impact: a deployment could build with a stale generated Prisma runtime after the additive shipment-field migration.
- Root cause: `PRISMA_SCHEMA_VERSION` was not advanced with the new migration.
- Fix: changed it to `2026-09-16-distributor-order-operations` and added a regression assertion.
- Retest: targeted readiness suite passes 5/5; full suite and production build pass.

### P0 — Order progression trapped in obsolete warehouse workflow

- Impact: a paid order could lose its normal next action and require a separate logistics subsystem.
- Root cause: active transitions and UI assumed Innozanzi received and packed stock.
- Fix: active distributor-direct path, supplier shipment groups, tracking, documents, communications, exceptions and mobile controls now live inside Orders; legacy states remain readable.
- Retest: lifecycle, document, customer tracking, navigation and Order Operations tests pass.

## Unresolved failures and required action

### P1 — Old non-test hosted payment attempts

- Impact: a genuine payment can remain unreconciled or an abandoned attempt can remain operational noise.
- Evidence: production read-only audit found 12 attempts older than 30 minutes: 2 non-test and 10 test.
- Remaining action: Finance must compare gateway truth and close/recover the two non-test attempts before go-live.

### P1 — Trusted client address is not configured

- Impact: rate-limited endpoints use the shared conservative `unknown` bucket, risking false throttling and weakening client-specific abuse controls.
- Root cause: `TRUSTED_CLIENT_IP_HEADER` is absent.
- Remaining action: configure the header only where the ingress overwrites it, then verify spoof resistance and per-client behaviour.

### P0/P1 — Production-equivalent certification gaps

- Impact: gateway callbacks, concurrency capacity, browser/device behaviour and recovery have not been proven in the environment that will carry customer money.
- Remaining action: run both enabled gateway sandbox journeys; authenticated customer/Admin UAT; controlled load/concurrency/soak; worker restart; and an isolated backup restore.

### P2 — Market intelligence scope gap

- Impact: the requested confidence-rated, resumable market scan cannot be operated or certified.
- Remaining action: treat this as explicitly out of launch scope or implement and test it before advertising the capability.

## Production evidence

- Safe GET smoke: `/`, `/shop`, `/categories`, `/cart`, `/checkout`, `/sign-in`, catalogue suggestions, and a sampled supplier product returned 200. Protected account/Admin pages redirected to sign-in.
- Headers on sampled routes: CSP present, HSTS present, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.
- Production data audit: 4,439 active supplier offers; 0 missing costs; 0 stale eligible offers; 0 price exceptions; 0 failed emails; 0 pending paid-order communication; 0 paid orders without an active invoice.
- Data volumes sampled: 19 orders, 29 payments, 38 order-status events, 5 tracking events, 476 audit records, 104 notifications, and 4,573 supplier catalogue products.
- Dependency audit: 712 packages, 0 known npm vulnerabilities.

## Release gate

Do not accept real customer payments until every P0/P1 item above has a named owner, evidence, and a passing retest in the matrix. Re-run migration status and the safe production audit after deployment.
