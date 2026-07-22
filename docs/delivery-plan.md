# Historical delivery plan, decisions and risks

> Historical context: the implementation has passed these original phase gates and evolved into a quotation-led platform with partnership management. Use `system-audit-2026-07-23.md` for current completion and production readiness. Do not treat unimplemented early checkout targets below as current requirements.

## Current baseline

The repository has Next.js App Router, strict TypeScript, Tailwind CSS, Prisma 7/PostgreSQL, Supabase storage, Mailtrap and protected OpenAI access. Identity, RBAC, catalogue, quotation, payment-submission, order and tracking foundations are implemented. See `quotation-lifecycle-progress.md` for the current lifecycle gate.

The existing generic public upload route is a security risk because it is unauthenticated and creates a public bucket. Phase 2 will disable or replace it with purpose-specific routes before any public launch.

## Phase gates

### Phase 1 — architecture (this review point)

- Architecture and module boundaries.
- Route and authorization map.
- Target data model and transaction boundaries.
- Risks, assumptions and acceptance gates.

Exit: architecture reviewed; decisions below accepted or amended.

### Phase 2 — platform foundation

Planned changes:

- Install shadcn/ui dependencies, Zod, React Hook Form, Auth.js, Argon2, test tools and supporting libraries.
- Validate environment variables at startup without leaking values.
- Replace the placeholder Prisma schema with identity, RBAC, catalogue, supplier, inventory and audit foundations.
- Create a clean PostgreSQL migration and seed initial roles/permissions/admin.
- Implement registration, sign-in, verification, recovery, sessions and server-side permission checks.
- Add protected `/admin` shell and secure the upload surface.
- Add unit tests for authentication and explicit-deny authorization.

Exit: lint, typecheck, unit tests, migration and production build pass; an administrator can securely sign in and authorization is enforced server-side.

### Phase 3 — storefront and commerce

- Design system, branded homepage, catalogue, search/filtering and product detail.
- Anonymous/authenticated cart merge and persistence.
- Server-authoritative totals, VAT, promotions and stock-aware checkout.
- Orders and EFT workflow with private proof upload.
- Customer account foundations.

Exit: retail purchase happy path and critical failure paths pass unit/integration/Playwright tests.

### Phase 4 — administration

- Dashboard and reports baseline.
- Product/category/brand/supplier management.
- Inventory ledger, adjustments and safe reservation views.
- Orders, customers, payments and moderation workflows.

Exit: privileged workflows are permission-tested and audited; overselling concurrency tests pass.

### Phase 5 — quotations and integrations (implemented baseline)

- Quotation request/editor/versioning/PDF/conversion.
- Payment-provider adapters for Paystack, Yoco and EFT.
- Storage provider abstraction and public/private buckets.
- Email provider abstraction, templates and outbox delivery.

Exit: webhook idempotency, quotation conversion, private document access and provider failure handling pass tests.

### Phase 6 — content, reporting and hardening

- CMS, reviews, advanced promotions and all required reports/CSV.
- Sitemap, robots, structured data, metadata and canonical URLs.
- Accessibility, performance, observability, rate limits, security headers and runbooks.
- Complete seed catalogue, E2E suite and production documentation.

Exit: launch checklist, restore plan, security review, performance budget and full test suite pass.

### Phase 7 — access-control administration

- Administrative role creation and safe deletion.
- Per-role allow/deny permission rules, with explicit deny taking precedence.
- User-role assignment and removal with self-lockout and system-role protections.
- Audit records for every access-control change.

Exit: only users with `users.manage` can change access; system roles and the active Super Administrator remain protected.

## Assumptions requiring confirmation

1. Auth.js credentials authentication is acceptable; transactional email provider selection can happen in Phase 5.
2. Guest checkout is allowed, but customer account creation never happens implicitly without consent.
3. Product prices are VAT-inclusive for storefront display by default; the database stores explicit net, VAT and gross snapshots on documents.
4. Inventory is initially single-location. The model can add warehouses later without changing order line semantics.
5. Supabase Storage remains the first storage implementation, using separate public and private buckets.
6. Railway hosts the Next.js service and PostgreSQL; scheduled/background work needs a Railway worker or an external queue service.
7. Paystack and Yoco merchant credentials and webhook configuration will be supplied later.
8. Banking details and legal/company copy will be supplied before the EFT flow and footer go live.
9. One base currency, ZAR, is supported initially; currency is still recorded on every financial document.
10. Shipping initially uses configured rules/manual methods rather than live courier-rating APIs.

## Principal risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Overselling under concurrent checkout | Row locking/serializable transaction where necessary, inventory ledger, idempotent reservations and concurrency tests |
| Incorrect VAT or rounding | Prisma Decimal-only calculation module, line/document rounding policy and golden tests |
| Payment spoofing or duplicate webhooks | Provider signature verification, server-side amount verification, unique external event IDs and idempotent transitions |
| Privilege escalation | Deny-overrides-allow policy, server checks at service boundaries, account status checks and authorization tests |
| Private file disclosure | Purpose-specific upload routes, private buckets, ownership checks and short-lived signed URLs |
| Secret exposure | Server-only environment schema, no `NEXT_PUBLIC_` secrets, log redaction and rotation of credentials already shared in chat |
| Schema size and delivery risk | Domain-based migrations and review gates rather than a single implementation dump |
| Email/payment failure after order commit | Transactional outbox and retry-safe integration workers |
| Reporting load | Indexed aggregate queries initially; materialized views/read replica only after measured need |
| Unbounded AI cost | Keep the optional OpenAI route protected, capped and outside core commerce workflows |

## Decisions to lock before Phase 3

- Brand assets, colours, typography and approved company copy.
- VAT-inclusive versus VAT-exclusive merchandising policy for business customers.
- Delivery/collection rules and service areas.
- Account verification requirements before checkout or quotation acceptance.
- Return/refund policy and whether partial fulfilment is supported at launch.
- Product variant inventory policy and initial warehouse/location model.
