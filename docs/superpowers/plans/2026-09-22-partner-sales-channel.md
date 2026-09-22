# Partner Sales Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a controlled co-branded B2B partner channel from approved catalogue and anonymous client enquiry through Innozanzi-approved quotation, verified payment, one distributor-direct order, reconciled commission, and finance-approved payout.

**Architecture:** Extend the existing Partnership, Quotation, Payment, Order, document, notification, pricing, and audit boundaries with additive partner-channel records. Public and partner readers use purpose-built redacted projections; all financial transitions use locked, idempotent server services. The feature remains globally disabled until both gateway journeys and payout reconciliation pass.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7/PostgreSQL, Zod, Decimal.js, Vitest, existing PDF/email/payment infrastructure.

**Spec:** `docs/superpowers/specs/2026-09-22-partner-sales-channel-design.md`

## Global Constraints

- Innozanzi approves the final client price; partners never edit price, discount, VAT, delivery, payment terms, validity, or commission.
- Innozanzi is merchant of record and receives PayFast/Ozow payments through the existing verified-payment finalizer.
- Orders remains the only fulfilment workspace; do not create partner inventory, warehouse, delivery, payment, or order engines.
- Commission becomes payable only after order completion and final financial reconciliation.
- Schema changes are additive; preserve every historical partnership, quotation, payment, order, and audit record.
- Store public secrets hashed; never expose internal cost, floor, supplier detail, margin, credentials, or internal notes in public/partner payloads.
- Critical mutations use stable bounded POST routes, row locks, idempotency keys, canonical redirects, and actionable errors.
- Default quotation validity is 48 hours; only Admin may override it.
- Public activation defaults off and requires an active partnership, satisfied agreement, approved profile, and explicit feature setting.
- Read the relevant guide in `node_modules/next/dist/docs/` before changing Next.js routes, forms, caching, or runtime behavior.

## Review Focus

- A partner user belonging to multiple or inactive partnerships must receive only the explicitly selected active channel or a denial; pin this in Task 3 authorization tests.
- Two simultaneous client acceptance/payment attempts for one quote version must produce one acceptance, payment intent, order, and commission; pin this in Tasks 8 and 9.
- Cost/stock changes between approval and payment must block payment and request repricing without rewriting the approved version; pin this in Tasks 7 and 9.
- Partial/full refunds and post-payment cancellation before and after payout must create correct holds/reversals/compensating entries; pin this in Tasks 11 and 12.
- Logo, partner copy, query parameters, PDFs, RSC payloads, email, and CSV exports must not permit script injection or internal-field disclosure; pin this in Tasks 4, 6, 8, and 13.

---

### Task 1: Add the partner-channel schema and reversible migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260922190000_partner_sales_channel/migration.sql`
- Modify: `src/lib/prisma.ts`
- Create: `tests/partner-sales-schema.test.ts`

**Interfaces:**
- Produces Prisma models `PartnerSalesProfile`, `PartnerCatalogueAssignment`, `PartnerClient`, `PartnerShowcase`, `PartnerShowcaseItem`, `PartnerQuoteCase`, `PartnerCommission`, `PartnerCommissionEntry`, `PartnerPayoutBatch`, and `PartnerPayoutItem` plus optional links on `QuotationRequest`, `Quotation`, `Order`, and `Payment`.
- Produces enums matching the spec state names and unique constraints for one profile per partnership, one case per accepted order, one commission per order, and one non-cancelled payout membership per commission.

- [ ] **Step 1: Write the failing schema contract test** asserting every model, enum, index, relation, commission decimal, hashed-token field, and additive migration exists; assert the migration contains no `DROP TABLE` or `DROP COLUMN`.
- [ ] **Step 2: Run `npx vitest run tests/partner-sales-schema.test.ts`** and confirm it fails because the first model is absent.
- [ ] **Step 3: Add the Prisma enums/models and inverse relations.** Use `Decimal(19,4)` for money, UUID foreign keys, explicit `onDelete` behavior, `@@index` for every ownership/status queue, and nullable links on existing rows.
- [ ] **Step 4: Generate the additive SQL migration** with enum creation, tables, indexes, unique constraints, and foreign keys; advance `PRISMA_SCHEMA_VERSION` to `2026-09-22-partner-sales-channel`.
- [ ] **Step 5: Run `npx prisma generate && npx vitest run tests/partner-sales-schema.test.ts && npx tsc --noEmit`.** Expect all pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: add partner sales channel data model"`.

### Task 2: Implement pure lifecycle, token, commission, and redaction policies

**Files:**
- Create: `src/domain/partner-sales/lifecycle.ts`
- Create: `src/domain/partner-sales/commission.ts`
- Create: `src/domain/partner-sales/tokens.ts`
- Create: `src/domain/partner-sales/redaction.ts`
- Create: `tests/unit/partner-sales-lifecycle.test.ts`
- Create: `tests/unit/partner-sales-commission.test.ts`
- Create: `tests/unit/partner-sales-security.test.ts`

**Interfaces:**
- Produces `assertCaseTransition(from,to)`, `assertProfileTransition(from,to)`, `assertCommissionTransition(from,to)`.
- Produces `calculatePartnerCommission({method,value,netSale}): Decimal` and `commissionEligibility(input): {eligible:boolean;reasons:string[]}`.
- Produces `createPublicToken(): {plain:string;hash:string}`, `hashPublicToken(token)`, and redacted DTO builders.

- [ ] **Step 1: Write failing lifecycle tests** for every normal and exception transition in the spec, including terminal-state rejection.
- [ ] **Step 2: Write failing calculation tests** proving percentage uses VAT-exclusive sale value, fixed commission stays fixed, negative/over-sale values reject, refunds reduce eligibility, and unreconciled/completion-missing orders remain pending.
- [ ] **Step 3: Write failing security tests** proving token hashes are deterministic but plaintext tokens are random, and public/partner DTO JSON excludes `cost`, `floor`, `margin`, `supplier`, `internalNote`, and gateway evidence keys.
- [ ] **Step 4: Run the three test files** and verify failures are missing exports.
- [ ] **Step 5: Implement the minimal pure modules** with exhaustive typed state maps, Decimal arithmetic, SHA-256 token hashing over 32 random bytes, and explicit allow-list serializers.
- [ ] **Step 6: Run the three test files and `npx tsc --noEmit`.** Expect pass.
- [ ] **Step 7: Commit:** `git commit -m "feat: define partner sales policies"`.

### Task 3: Add feature settings, permissions, and partnership-scoped authorization

**Files:**
- Modify: `src/domain/auth/permissions.ts`
- Create: `src/domain/partner-sales/settings.ts`
- Create: `src/domain/partner-sales/access.ts`
- Create: `tests/partner-sales-access.test.ts`
- Modify: `prisma/migrations/20260922190000_partner_sales_channel/migration.sql`

**Interfaces:**
- Produces permissions `partner_sales.profile.approve`, `partner_sales.catalogue.manage`, `partner_sales.pricing.approve`, `partner_sales.commission.manage`, `partner_sales.payout.prepare`, and `partner_sales.payout.approve`.
- Produces `partnerSalesSettings()` and `requirePartnerSalesContext(requestedPartnershipId?)` returning one active authorized partnership or redirecting/throwing denial.

- [ ] **Step 1: Write failing tests** for disabled feature, inactive/suspended partnership, missing agreement, unrelated partnership ID, multiple memberships without explicit selection, and valid active access.
- [ ] **Step 2: Run `npx vitest run tests/partner-sales-access.test.ts`** and verify the missing-module failure.
- [ ] **Step 3: Implement settings and access** using existing `SiteSetting`, session context, permission conventions, and server-only queries.
- [ ] **Step 4: Add permission definitions without granting them automatically** and test Admin permission separation between price approval, payout preparation, and payout approval.
- [ ] **Step 5: Run focused tests and `npx tsc --noEmit`.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: secure partner sales access"`.

### Task 4: Build Admin profile activation and constrained branding

**Files:**
- Create: `src/domain/partner-sales/profile-service.ts`
- Create: `src/app/api/admin/partner-sales/profiles/[partnershipId]/route.ts`
- Create: `src/app/admin/partnerships/partners/[id]/sales-channel/page.tsx`
- Modify: `src/app/admin/partnerships/partners/[id]/page.tsx`
- Create: `tests/partner-sales-profile.test.ts`

**Interfaces:**
- Produces `savePartnerSalesProfile(input,actor)` and `transitionPartnerSalesProfile(input,actor)`.
- Consumes stable upload/document infrastructure for one validated image logo; accepts only approved text fields and theme preset identifiers.

- [ ] **Step 1: Write failing service/route tests** for required fields, slug collision, invalid logo type/size, script-bearing footer copy, self-approval denial, inactive partnership, audit creation, and canonical redirect.
- [ ] **Step 2: Run the focused test** and confirm failure.
- [ ] **Step 3: Implement transactional profile saving/approval** with Zod bounds, normalized unique slugs, permission checks, audit before/after, and no arbitrary CSS/HTML.
- [ ] **Step 4: Build the Admin page** with onboarding readiness, preview, approval/change-required/suspension controls, and visible success/error states.
- [ ] **Step 5: Run focused tests, typecheck, and route build.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: manage partner sales profiles"`.

### Task 5: Implement approved catalogue assignments and public partner catalogue

**Files:**
- Create: `src/domain/partner-sales/catalogue.ts`
- Create: `src/app/api/admin/partner-sales/catalogue/route.ts`
- Create: `src/app/admin/partnerships/partners/[id]/sales-channel/catalogue/page.tsx`
- Create: `src/app/(store)/p/[partnerSlug]/page.tsx`
- Create: `src/app/(store)/p/[partnerSlug]/not-found.tsx`
- Create: `tests/partner-sales-catalogue.test.ts`

**Interfaces:**
- Produces `assignCatalogueItem`, `withdrawCatalogueItem`, `partnerCatalogue(slug,now)` returning only active approved sellable DTOs.

- [ ] **Step 1: Write failing tests** for explicit assignment, withdrawn/expired item omission, inactive channel 404, changed stock/cost eligibility, cross-partner assignment denial, and HTML/RSC DTO redaction.
- [ ] **Step 2: Run the focused test** and confirm failure.
- [ ] **Step 3: Implement catalogue services and stable Admin POST route** with typed source identity and audit records.
- [ ] **Step 4: Build the responsive co-branded public page** using approved logo/copy/assets, merchant disclosure, and “Request quotation” actions without client pricing.
- [ ] **Step 5: Run tests, typecheck, lint, and build.** Expect pass except documented pre-existing warnings.
- [ ] **Step 6: Commit:** `git commit -m "feat: publish approved partner catalogues"`.

### Task 6: Add showcases, secure links, clients, and anonymous enquiries

**Files:**
- Create: `src/domain/partner-sales/showcases.ts`
- Create: `src/domain/partner-sales/enquiries.ts`
- Create: `src/app/account/partner/showcases/page.tsx`
- Create: `src/app/account/partner/showcases/new/page.tsx`
- Create: `src/app/(store)/p/[partnerSlug]/s/[publicId]/page.tsx`
- Create: `src/app/api/partner-sales/enquiries/route.ts`
- Create: `tests/partner-sales-enquiries.test.ts`

**Interfaces:**
- Produces `createShowcase`, `activateShowcase`, `revokeShowcase`, `resolveShowcase`, and `createPartnerEnquiry` returning a case number.
- Consumes Task 2 tokens/redaction and Task 5 catalogue eligibility.

- [ ] **Step 1: Write failing tests** for public/private showcase access, hash-only storage, token tampering, expiry/revocation, withdrawn items, duplicate submission idempotency, bounded fields, consent, rate-limit hook, and cross-partner client isolation.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement showcases and immutable item snapshots** with a one-time plaintext token return and server-only hash comparison.
- [ ] **Step 4: Implement the guarded public enquiry POST route** using `boundedFormData`, Zod validation, abuse controls, case/client/request transaction, and PRG redirect to a non-sensitive confirmation URL.
- [ ] **Step 5: Build partner showcase management and public showcase/enquiry pages** with escaped text and no arbitrary markup.
- [ ] **Step 6: Run focused tests, typecheck, lint, and build.** Expect pass.
- [ ] **Step 7: Commit:** `git commit -m "feat: capture partner client enquiries"`.

### Task 7: Add Admin quote-case pricing, commission approval, and immutable versions

**Files:**
- Create: `src/domain/partner-sales/pricing.ts`
- Create: `src/domain/partner-sales/cases.ts`
- Create: `src/app/admin/partnerships/sales-cases/page.tsx`
- Create: `src/app/admin/partnerships/sales-cases/[id]/page.tsx`
- Create: `src/app/api/admin/partner-sales/cases/[id]/approve/route.ts`
- Modify: `src/domain/quotations/lifecycle.ts`
- Create: `tests/partner-sales-pricing.test.ts`

**Interfaces:**
- Produces `quotePartnerCase(caseId,actor)` preview and `approvePartnerQuotation(input,actor)` returning immutable quotation/version/commission IDs.
- Consumes commerce engine/current supplier availability and Task 2 commission calculation.

- [ ] **Step 1: Write failing tests** for protected floor, VAT/delivery/gateway/reserve, percentage/fixed default, audited override reason, negative post-commission contribution denial, 48-hour default, Admin expiry override, stale cost/stock fingerprint, self-approval restriction, and immutable prior versions.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement preview and locked approval transaction** that snapshots all internal and client commercial values, creates a new version, updates the case, and never publishes internal fields.
- [ ] **Step 4: Build the Admin queue/editor** with clear internal economics, client total, commission, expected contribution, version history, and approval errors.
- [ ] **Step 5: Run tests, typecheck, lint, and build.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: approve partner client pricing"`.

### Task 8: Add partner review, co-branded documents, sending, and client acceptance

**Files:**
- Create: `src/domain/partner-sales/documents.ts`
- Create: `src/domain/partner-sales/partner-review.ts`
- Create: `src/app/account/partner/sales/page.tsx`
- Create: `src/app/account/partner/sales/[caseNumber]/page.tsx`
- Create: `src/app/api/partner-sales/cases/[id]/review/route.ts`
- Create: `src/app/api/partner-sales/quotes/[token]/accept/route.ts`
- Create: `src/app/(store)/partner-quote/[token]/page.tsx`
- Create: `tests/partner-sales-quotation.test.ts`

**Interfaces:**
- Produces `requestPartnerRevision`, `sendPartnerQuotation`, `renderPartnerQuotationPdf`, `resolveClientQuotation`, and `acceptPartnerQuotation`.

- [ ] **Step 1: Write failing tests** for partner ownership, forbidden price fields, revision/sending transitions, expired/revoked token, acceptance of only latest approved version, concurrent double acceptance, co-branded disclosure, PDF escaping, and absence of internal fields.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement partner review/send services and stable routes** with case locks, idempotent sending, and immutable version references.
- [ ] **Step 4: Implement separate internal and client PDF projections** from the same approved snapshot.
- [ ] **Step 5: Build partner case and public quotation pages** with exact total, expiry, terms, merchant disclosure, acceptance consent, and accessible responsive controls.
- [ ] **Step 6: Run tests, typecheck, lint, and build.** Expect pass.
- [ ] **Step 7: Commit:** `git commit -m "feat: issue partner client quotations"`.

### Task 9: Connect accepted quotations to PayFast/Ozow and one order

**Files:**
- Modify: `src/domain/quotations/conversion.ts`
- Modify: `src/domain/payments/finalize.ts`
- Create: `src/domain/partner-sales/payment.ts`
- Modify: `src/app/pay/[paymentId]/page.tsx`
- Create: `tests/partner-sales-payment-order.test.ts`

**Interfaces:**
- Produces `createPartnerQuotePayment(acceptedVersionId,provider)` and `linkPaidPartnerOrder(tx,input)`; both are idempotent.
- Consumes existing hosted gateway adapters and authoritative finalizer.

- [ ] **Step 1: Write failing tests** for PayFast and Ozow, amount/currency/version mismatch, expired quote, cost/stock drift before payment, return-before-webhook, replay/concurrency, exactly one order/invoice/commission, exact snapshot line values, and multi-supplier lines.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement payment intent creation** only for current accepted eligible versions; recheck fingerprint before presenting hosted fields.
- [ ] **Step 4: Extend the locked paid finalizer transaction** to link the case/order, create one locked commission, preserve verified evidence on operational exceptions, and enqueue durable communication events.
- [ ] **Step 5: Run payment, quotation, order, inventory, and focused partner tests.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: convert paid partner quotes to orders"`.

### Task 10: Add redacted partner order tracking and Admin linkage

**Files:**
- Create: `src/domain/partner-sales/orders.ts`
- Create: `src/app/account/partner/orders/page.tsx`
- Create: `src/app/account/partner/orders/[orderNumber]/page.tsx`
- Modify: `src/app/admin/orders/[id]/page.tsx`
- Modify: `src/app/mobile-admin/orders/[id]/page.tsx`
- Create: `tests/partner-sales-order-visibility.test.ts`

**Interfaces:**
- Produces `partnerOrders(context)` and `partnerOrder(context,orderNumber)` redacted projections.

- [ ] **Step 1: Write failing tests** for ownership, simple customer milestones, multi-supplier aggregation, private cost/note/supplier redaction, cancelled/refunded states, and Admin/Mobile case links.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement redacted order queries** without serializing Prisma entities directly.
- [ ] **Step 4: Build partner pages and add compact partner-case/commission panels inside desktop and Mobile Admin Orders.** Do not add a fulfilment subsystem.
- [ ] **Step 5: Run focused and order-operation suites, typecheck, lint, and build.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: track partner sales orders"`.

### Task 11: Implement commission eligibility, holds, adjustments, and reversals

**Files:**
- Create: `src/domain/partner-sales/commission-service.ts`
- Modify: `src/domain/commerce/reconciliation-actions.ts`
- Modify: `src/domain/admin/actions.ts`
- Modify: `src/domain/payments/actions.ts`
- Create: `src/app/admin/partnerships/commissions/page.tsx`
- Create: `src/app/api/admin/partner-sales/commissions/[id]/route.ts`
- Create: `tests/partner-sales-commission-ledger.test.ts`

**Interfaces:**
- Produces `evaluateCommission(orderId)`, `holdCommission`, `adjustCommission`, `reverseCommission`, and append-only `PartnerCommissionEntry` records.

- [ ] **Step 1: Write failing tests** for incomplete/unreconciled orders, completed eligibility, partial/full refund, cancellation, dispute/return hold, pre-payout reversal, post-payout compensating debit, override permission/reason, concurrency, and immutable paid entries.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement locked ledger services** and call evaluation after reconciliation/completion; call holds/reversals from refund/cancellation paths.
- [ ] **Step 4: Build the Admin commission queue** with evidence, reasons, before/after audit, and no direct destructive edits.
- [ ] **Step 5: Run focused plus reconciliation/refund/order suites.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: reconcile partner commissions"`.

### Task 12: Build finance-approved payout batches and statements

**Files:**
- Create: `src/domain/partner-sales/payouts.ts`
- Create: `src/domain/partner-sales/payout-pdf.ts`
- Create: `src/app/admin/partnerships/payouts/page.tsx`
- Create: `src/app/admin/partnerships/payouts/[id]/page.tsx`
- Create: `src/app/api/admin/partner-sales/payouts/[id]/route.ts`
- Create: `src/app/account/partner/payouts/page.tsx`
- Create: `tests/partner-sales-payouts.test.ts`

**Interfaces:**
- Produces `createPayoutBatch`, `approvePayoutBatch`, `markPayoutBatchPaid`, `cancelPayoutBatch`, and `renderPayoutStatement`.

- [ ] **Step 1: Write failing tests** for payable-only inclusion, duplicate membership, mixed-partner rejection, preparer/approver separation, missing EFT proof/reference, idempotent paid posting, cancellation release, post-payout compensation, statement totals, and partner redaction.
- [ ] **Step 2: Run the focused test** and verify failure.
- [ ] **Step 3: Implement locked batch/item services** with permissions, append-only ledger entries, document linkage, and audits.
- [ ] **Step 4: Build Admin preparation/approval/payment pages and partner statement list.**
- [ ] **Step 5: Run tests, typecheck, lint, and build.** Expect pass.
- [ ] **Step 6: Commit:** `git commit -m "feat: settle partner commission payouts"`.

### Task 13: Complete event communications, navigation, reporting, and abuse controls

**Files:**
- Create: `src/domain/partner-sales/communications.ts`
- Modify: `src/integrations/email/templates.ts`
- Modify: `src/components/admin/admin-nav.tsx`
- Modify: `src/components/account/account-nav.tsx`
- Modify: `src/app/account/layout.tsx`
- Create: `src/app/admin/partnerships/sales-channel/page.tsx`
- Create: `tests/partner-sales-communications.test.ts`
- Create: `tests/partner-sales-readiness.test.ts`

**Interfaces:**
- Produces stable audience-specific idempotency keys `partner-sales:{event}:{entityId}:{audience}` and durable client/partner/internal messages.

- [ ] **Step 1: Write failing tests** covering every spec event, audience-specific content, no duplicates, retryable failure, escaped partner/client content, internal-field redaction, navigation permissions, dashboard queues, and public endpoint limits.
- [ ] **Step 2: Run both focused tests** and verify failure.
- [ ] **Step 3: Implement event staging/templates** at the same transaction boundaries as enquiry, approval, send, acceptance, payment, order status, refund, eligibility, and payout.
- [ ] **Step 4: Add Admin and partner navigation/dashboard summaries** without exposing disabled-channel routes.
- [ ] **Step 5: Add operational reporting** for expired quotes, payment exceptions, failed email, commission holds, and payout exceptions.
- [ ] **Step 6: Run tests, typecheck, lint, and build.** Expect pass.
- [ ] **Step 7: Commit:** `git commit -m "feat: operate partner sales channel"`.

### Task 14: End-to-end acceptance, migration rehearsal, and controlled rollout

**Files:**
- Create: `tests/partner-sales-e2e.test.ts`
- Modify: `docs/PRODUCTION_READINESS_TEST_MATRIX.md`
- Create: `docs/commerce/partner-sales-runbook.md`
- Modify: `scripts/audit-commerce-launch.ts`

**Interfaces:**
- Produces a repeatable readiness audit and operational runbook; does not enable production automatically.

- [ ] **Step 1: Write the end-to-end test** that creates an active partner/profile/catalogue, anonymous client, showcase, enquiry, approved quote, partner send, client acceptance, verified PayFast payment, multi-supplier order, delivery/completion, reconciliation, payable commission, approved EFT payout, and statement.
- [ ] **Step 2: Add the equivalent Ozow path** and failure cases for duplicate callbacks, expired quote, refund before payout, and refund after payout.
- [ ] **Step 3: Run the E2E test** and fix only defects exposed in previously implemented boundaries.
- [ ] **Step 4: Rehearse migration status/deploy against the configured non-production database** using `npx prisma migrate status` and `npx prisma migrate deploy`; verify no destructive SQL and preserve historical counts.
- [ ] **Step 5: Extend the launch audit** to report feature flag, active profiles, orphan cases, quotation/payment/order mismatches, duplicate commissions, ineligible payable commissions, duplicate payout membership, and failed communications without printing private data.
- [ ] **Step 6: Write the runbook** with activation, suspension, quote exception, payment reconciliation, commission hold/reversal, payout approval, monitoring, and rollback procedures.
- [ ] **Step 7: Run fresh full verification:** `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build -- --webpack`; report every warning/failure by name.
- [ ] **Step 8: Perform authorized isolated PayFast and Ozow acceptance journeys** and record evidence in the readiness matrix. Do not simulate or claim live provider evidence that was not observed.
- [ ] **Step 9: Keep the global feature disabled until the acceptance matrix passes and the selected pilot partner is explicitly approved.**
- [ ] **Step 10: Commit:** `git commit -m "test: verify partner sales channel readiness"`.

### Task 15: Final review and production handoff

**Files:**
- Review all files changed by Tasks 1–14.
- Modify documentation only if verification reveals an actual discrepancy.

**Interfaces:**
- Consumes all prior task interfaces; produces the final reviewed release candidate.

- [ ] **Step 1: Run `git diff b833e42...HEAD --check` and inspect schema, authorization, public serializers, financial transactions, and route redirects line by line.**
- [ ] **Step 2: Run the complete verification commands from Task 14 again after review fixes.**
- [ ] **Step 3: Verify production migrations are applied before enabling routes and verify the global feature flag remains off.**
- [ ] **Step 4: Confirm no secrets/private financial fields appear in built public assets or representative public/partner responses.**
- [ ] **Step 5: Request independent code review focused on isolation, idempotency, financial accuracy, and rollback.**
- [ ] **Step 6: Resolve findings with test-first commits, then push the reviewed branch according to the user-approved integration method.**
