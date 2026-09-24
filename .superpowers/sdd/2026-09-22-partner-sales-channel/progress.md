# SDD ledger — plan: docs/superpowers/plans/2026-09-22-partner-sales-channel.md

Baseline: `ce2741a`; `npm test` passed 100 files / 385 tests on 2026-09-22.

## Pre-flight consistency scan

| Tasks | Shared file/interface | Finding |
|---|---|---|
| 1 → 2 | Partner enums and money/status fields consumed by pure policies | Consistent; Task 2 must import generated enum types only where that does not make pure tests database-dependent. |
| 1 → 3 | Schema settings/partnership relations consumed by scoped access | Consistent; access remains deny-by-default. |
| 1 → 4 | `PartnerSalesProfile` consumed by profile service and Admin UI | Consistent; one-profile-per-partnership uniqueness supports activation. |
| 1 → 5 | Profile and catalogue assignment models consumed by catalogue publication | Consistent; public projection must remain allow-listed. |
| 2 → 4 | Profile transition policy consumed by approval service | Consistent. |
| 2 → 6 | Token hashing and redaction consumed by showcases/enquiries | Consistent; plaintext token is returned once and never stored. |
| 2 → 7 | Commission calculation and lifecycle consumed by quote approval | Consistent; Admin controls all client prices. |
| 3 → 4-13 | Permissions/settings/context consumed by every protected route | Consistent; no automatic grants and explicit active partnership selection are mandatory. |
| 4 → 5-6 | Approved active profile gates public catalogue/showcases | Consistent. |
| 5 → 6-7 | Eligible catalogue snapshots feed enquiries and quote pricing | Consistent; withdrawn items remain historical snapshots but cannot form new quotes. |
| 6 → 7-8 | Case/client/showcase snapshots feed quote versions and client acceptance | Consistent; client-facing data excludes internal economics. |
| 7 → 8 | Immutable approved quote versions feed documents and acceptance | Consistent; later changes create versions, never rewrite approvals. |
| 7 → 9 | Cost/stock fingerprint and approved version consumed by payment/order finalization | Consistent; stale approvals block payment and request repricing. |
| 8 → 9 | Acceptance/payment intent must converge on one order | Consistent; concurrency uniqueness and locked finalization required. |
| 9 → 10 | Existing Order link consumed by redacted partner tracking | Consistent; Orders remains the sole fulfilment workspace. |
| 9 → 11 | Paid/completed/refunded facts consumed by commission eligibility | Consistent; payment alone never makes commission payable. |
| 11 → 12 | Commission ledger entries consumed by payout batches | Consistent; finance preparation and approval stay separated. |
| 4-12 → 13 | Events and redacted data feed communications/navigation/reporting | Consistent; each output channel needs injection and disclosure tests. |
| 1-13 → 14 | All implementation consumed by E2E, migration rehearsal, rollout controls | Consistent; feature remains off until gateway and reconciliation gates pass. |
| 1-14 → 15 | Whole branch consumed by final review/handoff | Consistent. |
| Task 1 | Tests require additive schema/migration and implementation supplies both | Self-consistent. |
| Task 2 | Tests map directly to lifecycle, calculation, token, and serializer exports | Self-consistent. |
| Task 3 | Access tests map to settings, permissions, and explicit partnership context | Self-consistent. |
| Task 4 | Service/route tests map to profile activation and constrained branding | Self-consistent. |
| Task 5 | Catalogue eligibility/redaction tests map to service, route, and public page | Self-consistent. |
| Task 6 | Security/idempotency tests map to showcase, client, and enquiry flow | Self-consistent. |
| Task 7 | Commercial control/version tests map to quote preview and locked approval | Self-consistent. |
| Task 8 | Review/document/acceptance tests map to immutable accepted version | Self-consistent. |
| Task 9 | Gateway convergence tests map to the existing verified-payment finalizer | Self-consistent. |
| Task 10 | Redacted tracking tests map to partner order projections and Admin links | Self-consistent. |
| Task 11 | Eligibility/refund tests map to append-only commission accounting | Self-consistent. |
| Task 12 | Maker-checker and reversal tests map to payout batches/statements | Self-consistent. |
| Task 13 | Event/navigation/export/abuse tests map to cross-cutting integration | Self-consistent. |
| Task 14 | Full journeys and migration rehearsal map to rollout readiness | Self-consistent. |
| Task 15 | Verification and review steps map to release handoff | Self-consistent. |

Ruling: Keep domain policy modules independent of Prisma runtime where feasible — generated enum types may be type-only imports — cost if wrong is minor refactoring during Task 2.

## Task progress

Task 1: complete — commits `9e758ba`, `e0353e4`; 392/392 tests pass; review approved after Fix Round 1 corrected active payout membership uniqueness to use semantic status and strengthened schema contracts.
Task 2: complete — commits `fd75aca`, `9826b50`; 410/410 tests pass; review approved after Fix Round 1 aligned redaction with persisted shapes, rejected non-finite/negative values, made lifecycle coverage exhaustive, and hardened array inputs.
Task 3: complete — commits `5a799df`, `7f423b4`, `eeaf256`, `5ca00ab`; 439/439 tests pass; review approved after three fix rounds enforcing explicit-only grants, UI assignability, targeted stale-grant cleanup, and executable cleanup coverage.
Task 4: complete — commits `98210ab`, `10fa095`; 465/465 tests pass; review approved after Fix Round 1 serialized lifecycle mutations, broadened plain-text validation, and completed transition audit snapshots.
Task 5: complete — commits `399915b`, `e744351`, `ac3aa4b`, `fcf1f56`; 498/498 tests pass; review approved after three fix rounds preventing supplier-media disclosure, fingerprinting promotional cost drift, resolving campaign aliases, scrubbing legacy media, and keeping public reads read-only.
Task 5: complete (commits 10fa095..399915b, tests: npm test -- tests/partner-sales-catalogue.test.ts →    Duration  343ms (transform 80ms, setup 0ms, import 203ms, tests 34ms, environment 0ms))
Task 6: complete (commits fcf1f56..6ab47d3, tests: npm test →    Duration  4.30s (transform 3.17s, setup 0ms, import 7.49s, tests 2.61s, environment 10ms))
Task 7: complete — commit subject `feat: approve partner client pricing`; pricing/approval tests: `npx vitest run tests/partner-sales-pricing.test.ts` → 1 file / 4 tests; full `npm test` → 113 files / 511 tests; `npx tsc --noEmit` and `npm run lint` passed; webpack build compiled but page-data collection requires configured `DATABASE_URL`/`DATABASE_PUBLIC_URL`.
Task 8: complete — commit `9b13050`; focused `npm test -- tests/partner-sales-quotation.test.ts` → 1 file / 8 tests; full `npm test` → 114 files / 519 tests; `npx tsc --noEmit` and `npm run lint` passed (four pre-existing warnings); webpack compiled but page-data collection requires configured `DATABASE_URL`/`DATABASE_PUBLIC_URL`.
Task 9: complete — focused partner payment/order tests → 1 file / 6 tests; full `npx vitest run` → 115 files / 525 tests; `npx tsc --noEmit` and `npm run lint` passed; webpack compiled and page-data collection requires configured `DATABASE_URL`/`DATABASE_PUBLIC_URL`.
Task 10: complete — redacted partnership-scoped order tracking, responsive partner pages, and Admin/Mobile Admin partner-case linkage; focused 4/4 and full 529/529 tests pass; `npx tsc --noEmit`, `npm run lint` (four pre-existing warnings), and `git diff --check` pass; webpack compiles but page-data collection requires configured `DATABASE_URL`/`DATABASE_PUBLIC_URL`.
