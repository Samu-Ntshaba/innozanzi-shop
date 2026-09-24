# Task 7 report — Admin partner quote pricing and immutable approvals

## Outcome

Implemented the Admin-only partner quote pricing workflow with Innozanzi-controlled commercial floors, VAT/delivery/gateway/reserve economics, commission defaults/overrides, stale evidence checks, maker-checker approval, and immutable quotation/version snapshots.

## Changes

- Added `src/domain/partner-sales/pricing.ts`.
  - Reuses the commerce protected-price and contribution calculations.
  - Rejects prices below the protected floor, insufficient stock, stale cost/stock fingerprints, invalid totals, and negative contribution after commission.
  - Supports percentage and fixed-rand commissions, requiring a plain-text audit reason for any deviation from the profile default.
  - Defaults partner quotation validity to 48 hours while accepting an explicit Admin expiry.
  - Provides separate internal and client snapshots; client snapshots contain no cost, floor, fee, reserve, landed-cost, contribution, or gateway fields.
- Added `src/domain/partner-sales/cases.ts`.
  - `quotePartnerCase(caseId, actor)` builds a live Admin preview from the case request and current source evidence.
  - `approvePartnerQuotation(input, actor)` uses a Serializable transaction, rejects self-approval by the Innozanzi case owner, creates a new quotation/version/commission estimate, updates the case, records status/audit history, and never rewrites prior quotation versions.
- Added Admin queue/detail pages and guarded approval route under `/admin/partnerships/sales-cases`.
- Added `PARTNER_QUOTATION_VALID_HOURS` and `partnerQuoteExpiry` to quotation lifecycle utilities.

## RED/GREEN evidence

Focused RED run before implementation:

```text
npx vitest run tests/partner-sales-pricing.test.ts
FAIL: module @/domain/partner-sales/pricing did not exist (0 tests)
```

Focused GREEN run:

```text
npx vitest run tests/partner-sales-pricing.test.ts
1 file passed, 4 tests passed
```

The focused tests cover protected floor and cost components, percentage/fixed commission, override reasons, 48-hour expiry and explicit expiry, negative contribution denial, self-approval, stale fingerprints, safe client projection, and approval IDs/audit transaction behavior.

## Verification

- `npm test` — passed, 113 files / 511 tests.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with four pre-existing warnings in Admin logistics/marketing/returns files; no Task 7 warnings or errors.
- `npm run build -- --webpack` — webpack compilation and TypeScript passed, but page-data collection stopped at the existing environment requirement `DATABASE_URL or DATABASE_PUBLIC_URL must be configured` while collecting `/partners/apply`.
- `git diff --check` — passed.
- Commit subject: `feat: approve partner client pricing`.

## Security notes

Approval requires the explicit `partner_sales.pricing.approve` grant (or super administrator), uses a serializable transaction, records approval and commission evidence in the audit log, and leaves prior quotation/version snapshots untouched. The Admin page is the only consumer of internal economics; the client projection is an explicit allow-list.
