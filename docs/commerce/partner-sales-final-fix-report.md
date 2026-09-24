# Partner sales final blocker-fix report

Base: `cf9cd46`
Commit: `a8df8b5` (`fix: close partner sales release blockers`)

## Fixes

- Added one canonical partner availability fingerprint contract for catalogue assignment, showcase/enquiry snapshots, quote pricing, and payment validation. It includes normalized source identity, base/effective promotional cost, promotion windows and active state, stock, availability state, and source details. Stale cost, promotion, stock, or time evidence still blocks repricing/payment.
- Locked quote cases during approval revisions. An existing unpaid `ESTIMATED` commission is re-estimated; an absent commission is created once; paid or advanced commission history is rejected rather than duplicated or mutated.
- Passed the exact immutable `QuotationVersion.snapshot` through partner send, email/PDF projection, and the partner case page. Client totals and line items are nonzero and exact.
- Enforced the global channel setting at public showcase/enquiry/quotation resolution, acceptance, and hosted-payment validation boundaries, before mutations.
- Removed the seven blank-line-at-EOF errors from the release diff.

## Verification

- RED→GREEN blocker, disabled-channel, revision/concurrency, quotation, payment, and catalogue tests passed.
- `npm test`: 123 files / 584 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with four documented pre-existing warnings.
- `npm run build -- --webpack`: webpack compilation and TypeScript passed; page-data collection requires configured `DATABASE_URL` or `DATABASE_PUBLIC_URL`.
- `git diff b833e42...HEAD --check`: passed.

## Final release-safeguard pass (base `bc9e6fb`)

- Partner enquiries and approved quote versions now retain immutable client identity, phone, delivery address, and delivery instructions; paid partner orders create an `OrderAddress` and fulfilment notes from that accepted snapshot.
- Supported COMBO catalogue sources carry immutable component evidence and canonical availability fingerprints through pricing and payment. Legacy CAMPAIGN identities remain rejected.
- Review email/PDF/public projections and eligibility read only the approved immutable version snapshot, including profile branding/contact, client details, terms, items, totals, and validity. Quotation token signing fails closed without a configured secret outside explicit test injection.
- PayFast/Ozow retries converge on the existing partner payment/order. The partner feature flag is enforced at finalization and return recovery, leaving non-partner payments unchanged.
- Refund and return resolution paths hold/reconcile commission through idempotent append-only entries; payment locks advance `LOCKED_ON_PAYMENT` to `PENDING_COMPLETION`, then evaluation advances eligible commissions to `PAYABLE`. Paid reversals use compensating correction entries.
- Payout batches accept an idempotency key under lock, reject mismatched replay, and persist a redacted formula-safe statement payload/document with an authenticated partner download route.
- Review redirects use the canonical case number. The migration is additive: destructive cleanup moved to an explicit idempotent backfill, and rollout force-disables the feature setting without deleting unrelated settings. The runbook documents forward-only rollback and backfill execution.

Verification for this pass: focused partner release/token/payment/quotation/payout/catalogue tests passed; `npm test` passed 124 files / 590 tests; `npx tsc --noEmit` passed; `npm run lint` passed with four pre-existing warnings; webpack compilation and TypeScript passed, while Next page-data collection was blocked only by missing `DATABASE_URL`/`DATABASE_PUBLIC_URL`; `git diff b833e42...HEAD --check` passed.
