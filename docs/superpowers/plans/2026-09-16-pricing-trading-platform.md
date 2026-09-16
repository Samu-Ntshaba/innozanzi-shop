# Pricing & Trading Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved governed Pricing & Trading workspace, including persistent market evidence, resumable scans, deterministic recommendations, approval-controlled price overrides, permissions, risk visibility and audit history.

**Architecture:** Add the approved models through one backward-compatible Prisma migration. Keep OpenAI market research isolated behind a validated observation boundary; deterministic code calculates benchmarks, risks and recommendations. Admin actions re-read current data, enforce permissions and the current commercial floor, and write decision, override and audit records transactionally. Automation defaults to `SUGGEST_ONLY`; `AUTO_APPLY` remains unavailable until separately certified.

**Tech Stack:** Next.js 16 App Router and Server Actions, React 19, TypeScript, Prisma 7/PostgreSQL, Zod, Decimal.js, OpenAI Responses API, Vitest.

**Spec:** `docs/commerce/pricing-trading-design.md`

## Global Constraints

- Do not expose supplier cost, customer information, credentials or internal notes to OpenAI.
- Only exact GTIN or brand-plus-MPN matches with non-conflicting variants may enter benchmarks.
- Temporary promotional prices remain separate from normal-price benchmarks.
- Low/medium confidence evidence cannot propose or apply a production price.
- Every price mutation rechecks current cost, freshness, floor and reviewed fingerprint server-side.
- No global automatic repricing; initial runtime supports `OFF` and `SUGGEST_ONLY` only.
- Existing order, payment and pricing snapshots remain immutable.
- All schema changes are additive; historical records are preserved.

---

### Task 1: Navigation, permissions and regression boundary

**Files:**
- Modify: `src/components/admin/admin-nav.tsx`
- Modify: `src/domain/auth/permissions.ts`
- Modify: `prisma/seed.ts`
- Test: `tests/unit/admin-navigation-permissions.test.ts`
- Test: `tests/pricing-trading-readiness.test.ts`

**Interfaces:**
- Produces permissions `trading.view`, `trading.market.manage`, `trading.rules.manage`, `trading.decisions.manage`, and `trading.audit.view`.
- Produces visible Pricing & Trading routes consumed by later page tasks.

- [ ] Write failing navigation and permission tests for the complete approved menu.
- [ ] Run the targeted tests and confirm they fail because Trading routes are absent.
- [ ] Add the Pricing & Trading group, route-permission mappings and permission keys; keep existing role grants unchanged except the seed's super-administrator catch-all.
- [ ] Run targeted tests and confirm they pass.

### Task 2: Additive persistence and deterministic analysis

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260916150000_pricing_trading_platform/migration.sql`
- Create: `src/domain/trading/config.ts`
- Create: `src/domain/trading/analysis.ts`
- Create: `src/domain/trading/effective-price.ts`
- Modify: `src/lib/prisma.ts`
- Test: `tests/trading-analysis.test.ts`
- Test: `tests/trading-effective-price.test.ts`

**Interfaces:**
- Produces `tradingRulesSchema`, `DEFAULT_TRADING_RULES`, `validateObservation`, `marketBenchmark`, `tradingPosition`, and guarded override resolution.
- Persists `MarketProduct`, `TradingSession`, `MarketScanJob`, `MarketObservation`, `MarketBenchmark`, `TradingDecision`, and `TradingPriceOverride`.

- [ ] Write failing analysis tests for identifier/variant matching, URL validation, confidence, promotion isolation, floor protection and expired overrides.
- [ ] Run targeted tests and confirm missing-module failures.
- [ ] Implement deterministic schemas and functions from the approved drafts, explicitly rejecting `AUTO_APPLY` at runtime.
- [ ] Add Prisma models, relationships, indexes and additive SQL; advance `PRISMA_SCHEMA_VERSION`.
- [ ] Generate Prisma client, validate schema and run targeted tests.

### Task 3: Product identities, sessions and resumable jobs

**Files:**
- Create: `src/domain/trading/products.ts`
- Create: `src/domain/trading/sessions.ts`
- Create: `src/domain/trading/jobs.ts`
- Test: `tests/trading-sessions.test.ts`
- Test: `tests/trading-jobs.test.ts`

**Interfaces:**
- Produces `syncMarketProducts()`, `startTradingSession()`, `claimMarketScanJobs()`, `completeMarketScanJob()` and `failMarketScanJob()`.
- Job claims use lease tokens and bounded batches; retries never exceed configured limits.

- [ ] Write failing tests for monthly deduplication, exact product identity, bounded seeding, exclusive leases, retry delay and resume-after-expiry.
- [ ] Run targeted tests and confirm expected failures.
- [ ] Implement transaction-safe product/session seeding and PostgreSQL lease claiming.
- [ ] Implement completion/failure checkpoints and session progress finalisation.
- [ ] Run targeted tests and Prisma validation.

### Task 4: Validated market research worker

**Files:**
- Create: `src/domain/trading/research.ts`
- Create: `src/domain/trading/worker.ts`
- Create: `src/app/api/cron/trading-scan/route.ts`
- Test: `tests/trading-research.test.ts`
- Test: `tests/trading-worker.test.ts`

**Interfaces:**
- `researchMarketProduct(identity)` returns cited, schema-validated observations only.
- `runTradingBatch()` claims a bounded batch, persists immutable observations/benchmark/analysis and records actionable failure codes.

- [ ] Write failing tests for prompt minimisation, citation enforcement, malformed responses, timeout/429 handling and one-job failure isolation.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement Responses API web-search research without confidential inputs or authority to mutate prices.
- [ ] Implement the cron route with constant-time `CRON_SECRET` authentication and bounded work.
- [ ] Run targeted tests.

### Task 5: Recommendations, approval and safe overrides

**Files:**
- Create: `src/domain/trading/decisions.ts`
- Create: `src/domain/trading/actions.ts`
- Modify: `src/domain/catalogue/retail-pricing.ts`
- Test: `tests/trading-decisions.test.ts`
- Test: `tests/retail-pricing.test.ts`

**Interfaces:**
- Produces proposed decisions from deterministic analysis and optional AI explanation.
- `approveTradingDecision(formData)` applies only a still-current, high-confidence, above-floor proposal and writes decision, override and audit atomically.
- Catalogue price resolution consumes active, safe overrides and falls back to system pricing otherwise.

- [ ] Write failing tests for stale fingerprints, floor changes, cost changes, permission denial, audit rollback and expired/unsafe fallback.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement suggestion generation and server-authorised approval/rejection actions.
- [ ] Integrate safe override resolution into supplier retail pricing without changing historical order snapshots.
- [ ] Run targeted and catalogue/checkout suites.

### Task 6: Complete Admin workspace

**Files:**
- Create: `src/app/admin/pricing-trading/page.tsx`
- Modify: `src/app/admin/pricing/page.tsx`
- Modify: `src/app/admin/trading/page.tsx`
- Create: `src/app/admin/trading/market/page.tsx`
- Create: `src/app/admin/trading/sessions/page.tsx`
- Create: `src/app/admin/trading/sessions/[id]/page.tsx`
- Create: `src/app/admin/trading/rules/page.tsx`
- Create: `src/app/admin/trading/history/page.tsx`
- Create: `src/app/admin/risk/page.tsx`
- Test: `tests/pricing-trading-readiness.test.ts`

**Interfaces:**
- Pages consume persisted session/job/benchmark/decision data and the Task 5 actions.
- Risk page exposes stale feeds, below-floor products, cost increases, low-confidence evidence and failed jobs.

- [ ] Extend failing route/source tests for every approved workspace and for removal of broken links.
- [ ] Run targeted tests and confirm failures.
- [ ] Implement overview metrics, recommended-price queue, market evidence, session progress, rules, history and risk pages with bounded queries.
- [ ] Add progressive-enhancement forms for session creation, rule saving and decision review.
- [ ] Run targeted tests and production build type generation.

### Task 7: Operational automation and documentation

**Files:**
- Create: `railway.trading-cron.json`
- Modify: `docs/operations-runbook.md`
- Modify: `docs/PRODUCTION_READINESS_TEST_MATRIX.md`
- Modify: `docs/GO_LIVE_READINESS_REPORT.md`
- Test: `tests/pricing-trading-readiness.test.ts`

**Interfaces:**
- Scheduled endpoint starts/resumes the current monthly session only when monthly scanning is enabled.
- Documentation records exact enablement, monitoring, pause and recovery procedures.

- [ ] Write failing source-contract tests for cron configuration and operational safeguards.
- [ ] Run targeted tests and confirm failures.
- [ ] Add the bounded cron service and operational procedures; leave monthly scanning disabled by default.
- [ ] Update readiness evidence without claiming unexecuted live scans or gateway tests.
- [ ] Run targeted tests.

### Task 8: Full verification and deployment handoff

**Files:**
- Verify all modified files.

**Interfaces:**
- Produces a migration-ready, disabled-by-default Trading platform with evidence-backed manual recommendations.

- [ ] Run `npm test` and record exact totals.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, `npx prisma validate`, and `git diff --check`.
- [ ] Run `./node_modules/.bin/next build --webpack` and classify environment-only warnings.
- [ ] Run `npx prisma migrate status` read-only against the configured database; do not deploy automatically.
- [ ] Review the complete diff for secrets, destructive SQL and accidental role grants.
- [ ] Commit and push `main` only after every local quality gate passes.
