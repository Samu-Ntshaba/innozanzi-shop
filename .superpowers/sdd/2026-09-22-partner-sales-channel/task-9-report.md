# Task 9 report — partner quote payment/order convergence

## Delivered

- Added `createPartnerQuotePayment(acceptedVersionId, provider)` with deterministic idempotency, case locking, accepted-version/amount/currency/expiry checks, immutable-version line snapshots, and live Product/Supplier cost/stock fingerprint revalidation.
- Added `linkPaidPartnerOrder(tx, input)` and integrated it into the verified PayFast/Ozow finalizer. Paid callbacks/retries converge on one partner case, order link, commission lock, and quotation conversion while preserving the existing durable payment recovery evidence path.
- Added anonymous partner hosted payment rendering and payment-return routing, PayFast/Ozow selection after acceptance, and a guard preventing generic quotation conversion from creating a parallel partner order.
- Added focused coverage for both gateways, stale approvals, version/amount mismatch, immutable line values, supplier lines, and idempotent paid commission linking.

## Verification

- `npx vitest run tests/partner-sales-payment-order.test.ts`: 1 file / 6 tests passed.
- `npx vitest run`: 115 files / 525 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with four pre-existing warnings outside Task 9.
- `npx next build --webpack`: webpack compilation and TypeScript passed; page-data collection remains blocked by missing `DATABASE_URL`/`DATABASE_PUBLIC_URL` in this environment.
- `npm run build` (Turbopack): sandbox prevented a child process from binding a port while processing CSS; webpack build reached the documented database configuration blocker.

## Ruling

Partner payment intent creates the pending Order/Payment pair before hosted fields, as the existing gateway architecture requires a stable payment reference. Verified finalization remains the only paid transition; generic quotation conversion is explicitly rejected for partner-originated quotations.
