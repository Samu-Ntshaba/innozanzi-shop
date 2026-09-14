# Pricing & Trading — implementation design

## 1. Existing pricing architecture

`SiteSetting[commerce.pricing.v1]` is the active settings document. `commerce/engine.ts` calculates cost-band contribution floors, fees, VAT and configured allocations. `catalogue/retail-pricing.ts` provides the supplier selling price shared by Syntech and Pinnacle. Local catalogue prices retain their existing guarded workflow. Order items retain selling prices, supplier cost and source/settings snapshots.

## 2. Reproduced publish failure

The publication lock used `$queryRaw SELECT pg_advisory_xact_lock(...)`. Against the configured PostgreSQL database this fails with `Failed to deserialize column of type 'void'`. Casting the result to text succeeds. The same issue affected the newly added email serialization lock. The read-only catalogue preview completed in about 2 seconds across 4,441 offers with zero pricing exceptions. Null supplier RRP is not the cause.

Publication now casts the lock result, atomically writes active settings, an active version pointer and immutable audit snapshot, and returns explicit success/error messages. Validation errors stay readable; unexpected failures receive a trace reference. Draft saving does not activate prices. A publish/audit failure rolls back all active changes. No database approval flag was forced, and no production configuration was published during diagnosis.

## 3. Relevant existing models

Reuse SiteSetting, AuditLog, SupplierCatalogueProduct, SupplierFeed, Supplier, Product/ProductVariant, Order/OrderItem, Payment/GatewayEvent, Notification and existing Permission/RolePermission. Existing supplier identityKey deduplicates exact offers; supplier offers remain separate. There are no existing market benchmark, trading session or override models.

## 4–6. Existing administration and data flow

Pricing currently appears under Marketing and contains the settings editor, simulator and saved order estimates. Supplier feeds update their source records; the shared pricing wrapper calculates customer prices at read time. Catalogue, cart and checkout call that wrapper. Checkout revalidates reviewed totals and freezes the commercial snapshot. Authoritative payment notifications activate paid orders; browser returns cannot do so.

## 7. Additive schema

Add separate MarketProduct identities, TradingSession records, leased MarketScanJob records, immutable MarketObservation/MarketBenchmark records, TradingDecision records and TradingPriceOverride records. Link observations and decisions to sessions. Use existing AuditLog for price-action history and existing SiteSetting for trading rules. Do not migrate historical order amounts. No existing table is replaced or dropped.

## 8. Navigation

A Pricing & Trading sidebar group will contain Overview, Pricing, Trading Desk, Market Review, Promotions, Trading Sessions, Automation & Rules and Price History / Audit. Existing `/admin/pricing` remains the calculation/settings route. Trading screens use the existing AdminPage, Panel, table and form components.

## 9. Market intelligence

Server-side Responses API `web_search` through the existing OpenAI client. Search only public product identifiers/specifications; never supplier cost, customer records or credentials. Validate structured observations and exact identifiers, new condition, stock, currency, South African retailer context, variant evidence and cited URLs. Compute confidence from observable evidence quality and independent retailer coverage, rather than trusting a model probability. Keep normal and promotional benchmarks separate. Failed/low-confidence research never changes effective prices.

Official API reference: https://developers.openai.com/api/docs/guides/tools-web-search

## 10. Sessions and jobs

One unique full session per calendar month, seeded on the first day. Deduplicate eligible customer-facing offers by exact identity. Each product gets one leased/checkpointed job per session. A separate resumable worker processes bounded batches, retries transient failures and preserves completed jobs. On-demand checks create separate sessions so new observations never overwrite previous monthly snapshots. Session progress comes from job states; browser requests enqueue work and return promptly.

## 11. Risks and migration boundaries

Apply the additive migration before activating trading screens. Seed new permission definitions without changing existing role grants. Smart Trading defaults to SUGGEST_ONLY; global automatic repricing is prohibited. Scoped AUTO_APPLY remains gated pending explicit production validation. Manual and suggested changes recheck current costs, minimum floor, reviewed-price fingerprint and permissions during publication. Expired or newly unsafe overrides fall back to the latest system price. Monthly search budgets and worker concurrency must be configured before enabling a real scan.

Deployment remains blocked pending approved commercial fee/delivery settings and reconciliation of the 10 old hosted payment attempts found during the read-only audit. No real supplier order, payment/refund or test customer email is authorised by this implementation.

## 12. Sequence

1. Reproduce and verify the publication fix (read-only database diagnostics and transactional regression tests).
2. Add isolated price-source and override resolution models.
3. Add navigation and overview.
4. Add validated market observations and individual checks.
5. Add monthly sessions and resumable jobs.
6. Add deterministic risk/opportunity classification.
7. Add desk/review queues and product drill-down.
8. Add explicit manual price review and publication.
9. Add Smart Trading suggestions with commercial explanations.
10. Add promotional evidence views.
11. Verify permissions, audit records, bulk previews and historical-order invariance.
12. Keep AUTO_APPLY gated until separately validated in production.

## Current implementation status and Phase 1 gate

The pricing repair and admin feedback/draft/version changes are implemented. Verification: 289 tests pass, TypeScript passes, production webpack build passes, lint has no errors. A repeat read-only preview calculated 4,441 offers with zero exceptions; the original advisory-lock failure and successful cast were both verified against the configured database.

Authenticated production publication through checkout/order has not been tested. The audited active configuration was absent, and commercial fee/delivery assumptions still need operator verification. Per the brief's explicit “STOP and verify pricing works” instruction, broader platform implementation is paused at that acceptance boundary.

Proposed model, SQL, classification and configuration files under `docs/commerce/proposed-trading-*` are design drafts only. They are not executable application features or deployable Prisma migrations. No monthly scans, pricing overrides or automatic repricing are enabled. The next implementation step after Phase 1 acceptance is the effective-price source/resolver model, followed by the remaining phases above.
