# Task 6 report — showcases, secure links, clients, and anonymous enquiries

## Outcome

Implemented the partner showcase and anonymous enquiry flow on top of the Task 2 token/redaction policies and Task 5 approved catalogue assignments.

## Changes

- Added `createShowcase`, `activateShowcase`, `revokeShowcase`, `resolveShowcase`, and `resolveShowcaseRecord` in `src/domain/partner-sales/showcases.ts`.
  - Public and client-specific visibility are explicit.
  - Private access uses a cryptographically random one-time plaintext token return and stores only its SHA-256 hash.
  - Resolution checks profile/partnership/agreement activation, expiry, revocation, visibility, and constant-time token equality.
  - Showcase items are copied into immutable title, presentation-copy, media, source, and availability-fingerprint snapshots.
  - Showcase creation rejects withdrawn, expired, cross-profile, and no-longer-approved catalogue assignments.
  - Mutations audit actor, resource, visibility, item count, and revocation reason without logging secrets.
- Added `createPartnerEnquiry` in `src/domain/partner-sales/enquiries.ts`.
  - Zod-bounds company/contact/email/phone, destination, timing, instructions, item count/quantity, and idempotency input.
  - Requires explicit communication consent and applies the shared atomic rate-limit hook.
  - Resolves the showcase before the transaction, scopes/deduplicates `PartnerClient` by `(partnershipId,email)`, creates a safe `QuotationRequest` item snapshot and `PartnerQuoteCase`, and links them transactionally with Serializable isolation.
  - Uses a deterministic hashed request/case number for replay idempotency without adding plaintext secrets or a new schema field.
  - Rejects cross-partnership client fixtures and selected items outside the immutable showcase snapshot.
- Added guarded POST routes:
  - `src/app/api/partner-sales/enquiries/route.ts` uses same-origin/content-type checks, `boundedFormData`, generic redacted errors, and a 303 PRG redirect with no case number, email, or token in the confirmation URL.
  - `src/app/api/partner-sales/showcases/route.ts` creates authenticated public showcase drafts for the partner workspace.
- Added escaped React server pages for partner showcase management/new-showcase and public showcase/enquiry presentation. No arbitrary markup or `dangerouslySetInnerHTML` is used.
- Added `tests/partner-sales-enquiries.test.ts` covering private hash-only tokens, assignment withdrawal, tampering, expiry/revocation, lifecycle mutations, bounds/consent/rate limits, idempotency, partnership-scoped clients, route PRG, and page contracts.

## Verification

- `npx vitest run tests/partner-sales-enquiries.test.ts` — passed, 1 file / 9 tests.
- `npm test` — passed, 112 files / 507 tests.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with four pre-existing warnings in Admin logistics/media/returns files; no Task 6 errors or warnings.
- `npm run build -- --webpack` — compilation and TypeScript passed, but Next page-data collection stopped at the pre-existing environment requirement `DATABASE_URL or DATABASE_PUBLIC_URL must be configured` while collecting `/api/admin/orders/[id]/supplier-order`.

## Security notes

No private token, supplier data, cost, floor, margin, internal note, raw gateway evidence, or request stack trace is returned by the public/partner projections or redirects. Public text is rendered through normal React escaping and input validation rejects executable/markup-bearing content.
