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
