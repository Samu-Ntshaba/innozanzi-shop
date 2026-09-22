# Task 2 report — partner sales policies

## Scope

Implemented the pure partner-sales policy layer requested by Task 2. Runtime modules have no Prisma or database import; `lifecycle.ts` and `commission.ts` use Prisma enum imports as types only.

## Files

- `src/domain/partner-sales/lifecycle.ts`
- `src/domain/partner-sales/commission.ts`
- `src/domain/partner-sales/tokens.ts`
- `src/domain/partner-sales/redaction.ts`
- `tests/unit/partner-sales-lifecycle.test.ts`
- `tests/unit/partner-sales-commission.test.ts`
- `tests/unit/partner-sales-security.test.ts`

## RED evidence

Command run before implementation:

```text
npx vitest run tests/unit/partner-sales-lifecycle.test.ts tests/unit/partner-sales-commission.test.ts tests/unit/partner-sales-security.test.ts
```

Result: three test suites failed during module resolution because the requested policy modules did not yet exist:

- `@/domain/partner-sales/lifecycle`
- `@/domain/partner-sales/commission`
- `@/domain/partner-sales/redaction`

No test body executed (`0 test` in each suite), as expected for test-first imports of new modules.

## Exact tests

### Lifecycle

- `permits every normal quote-case transition`
- `permits quote-case revision and commercial exceptions only before terminal closure`
- `permits profile onboarding, rework, suspension, and closure without reopening a closed profile`
- `permits the commission accrual path and finance exceptions but never advances paid or reversed history`

### Commission

- `calculates percentage commission from the VAT-exclusive sale`
- `keeps approved fixed-rand commission fixed`
- `rejects negative and over-sale commission values`
- `holds eligibility when any refund, cancellation, chargeback, dispute, or return remains unresolved`
- `keeps commissions pending until completion and financial reconciliation are both present`

### Security

- `hashes tokens deterministically while issuing unpredictable plaintext secrets`
- `serializes public partner and showcase DTOs from explicit safe fields`
- `serializes partner order and commission DTOs without nested internal economics or payment evidence`

## GREEN evidence

Focused checks after implementation:

```text
npx vitest run tests/unit/partner-sales-lifecycle.test.ts tests/unit/partner-sales-commission.test.ts tests/unit/partner-sales-security.test.ts
```

Result: `3 passed`, `12 passed`.

```text
npx tsc --noEmit
```

Result: exit code `0` with no TypeScript diagnostic output.

Full suite before commit:

```text
npm test
```

Result: `104 passed`, `404 passed`.

## Self-review

- Lifecycle maps are exhaustive over the three generated status unions and assertions reject transitions not explicitly mapped, including terminal states.
- Commission uses `decimal.js` throughout; it rejects negative sale/value inputs, percentage values above 100, and fixed values above the VAT-exclusive sale.
- Eligibility is false until both order completion and financial reconciliation are present, and exposes stable reasons for all specified holds.
- Tokens use `randomBytes(32)` with URL-safe plaintext representation and SHA-256 hex storage hashes.
- All DTO builders are explicit allow-lists. They never spread input objects or recursively strip keys, so nested `cost`, `floor`, `margin`, `supplier`, `internalNote`, and gateway/provider evidence cannot escape into output JSON.
- `git diff --check` completed without whitespace errors.

## Concerns

- Vitest emits the repository's existing Vite `configLoader: 'native'` future-compatibility warning. It does not fail the focused or full test suites and is outside Task 2 scope.
- The DTO field selections intentionally remain narrow. Future route/service work should add only audience-approved fields to these serializers rather than returning persistence records directly.
