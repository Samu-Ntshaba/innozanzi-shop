# Commerce completion implementation plan

**Goal:** Finish the agreed commerce workflows while retaining the existing pricing engine, orders, admin shell and payment verification protections.

**Architecture:** Trading and Risk are permission-controlled read models over existing supplier, order, snapshot, reconciliation and audit data. All pricing mutations retain the draft/preview/publication workflow. Operations continue through existing procurement and tracking actions. No live charges, supplier purchases, refunds or test customer emails are permitted.

**Tech stack:** Existing Next.js 16, Prisma/PostgreSQL, Decimal.js, Vitest.

**Specification:** User-supplied commerce continuation, production pricing/order journey and ORD-MU1IUHOL incident briefs, attached in this conversation. The continuation brief ends midway through Trading Desk section 6; the complete pricing and payment briefs remain applicable.

## Deliverables

- [ ] Audit each of the 45 pricing/order requirements against implementation, tests and operational evidence. Record incomplete manual acceptance separately from implemented code.
- [ ] Trading: create `src/domain/commerce/trading.ts`, `src/app/admin/trading/page.tsx` and calculation tests. Report actual paid sales in selected periods, prior-period movement, expected snapshot contribution, explicitly scoped actual order profit, supplier costs/current selling price, floor headroom and price/cost movement. Missing snapshots remain unknown, never zero profit. Test quantities, refunds, empty history, mixed missing snapshots and period boundaries.
- [ ] Risk: create `src/domain/commerce/risk.ts`, `src/app/admin/risk/page.tsx` and risk tests. Identify pricing inputs/floor breaches, stale or failed feeds, payment exceptions, paid orders awaiting procurement, missing tracking and pending communications. Link to existing action screens; never silently mutate finance or fulfilment.
- [ ] Shared navigation: organise Pricing, Trading, Risk and Promotions within Commerce; enforce server-side permissions and existing mobile-admin access.
- [ ] Audit and fix pricing UI/draft race issues, supplier selection, discounts, snapshots and checkout checks. Preserve valid publication. Add behavioral regressions for any defects.
- [ ] Audit and fix order lifecycle, invoice/email retry idempotency, procurement, customer tracker and account access. Use isolated fixtures and existing test mechanisms; never test external effects on real customers.
- [ ] Confirm deployment of the payment recovery worker and inspect its operational evidence. ORD-MU1IUHOL remains blocked until authoritative PayFast evidence exists; do not fabricate it.
- [ ] Run all tests, TypeScript, lint and production build; review changes and push to main under existing authorization. Verify web/worker deployments and report exact remaining operator acceptance checks.

## Acceptance rules

`COMPLETE` requires end-to-end evidence, not file existence. Use `PARTIAL` for implemented paths without observed acceptance, `MISSING` for absent behavior and `BLOCKED` for missing authoritative external evidence. No synthetic commercial history, no inferred actual product profit from unallocated order totals, and no automatic price changes from analytics.
