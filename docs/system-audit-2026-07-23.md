# Final system audit — 23 July 2026

## Scope and evidence

The audit covered every repository Markdown file, App Router page and handler, domain action/service, Prisma model and migration, authentication/RBAC implementation, storage/email/payment/OpenAI/Syntech integration, seed/bootstrap script, test, build configuration and the most recent Git history. Production migration status and read-only integrity counts were checked against Railway PostgreSQL. This report describes the implementation, not superseded phase intentions.

## Current architecture and journeys

Innozanzi is a Next.js modular monolith backed by PostgreSQL. Customers browse products, build a quotation list, receive provisional and final quotations, upload private EFT proof, wait for finance verification, and then track the activated order through fulfilment. Administrators operate catalogue, quotations, finance, fulfilment, CRM, partnerships, communications, reporting and RBAC from one protected suite. Partners reuse the customer identity and gain a scoped workspace only after approval.

Authentication uses a custom opaque 256-bit cookie token. Only its SHA-256 hash is stored. Each request reloads session, user status and role grants; disabled, suspended, expired and soft-deleted users are denied. Explicit RBAC denies override allows. Customer, order, quotation, payment-document and partner ownership is enforced server-side.

## Module audit

| Module | Customer entry | Admin entry | Core entities | Lifecycle/controls | Status |
| --- | --- | --- | --- | --- | --- |
| Identity and onboarding | `/register`, `/sign-in`, verification/recovery, `/account` | `/admin/access-control`, customers, audit | User, Session, VerificationToken, CustomerProfile, CompanyProfile, Role/Permission | Verified active users only; hashed tokens; deny-overrides RBAC; abuse limits | Complete and production-ready |
| Catalogue and quotation list | `/shop`, categories, products, `/cart` | products, categories, brands, inventory, suppliers, Syntech | Product, Variant, Inventory, Cart | Published/active/available checks; server quantity validation | Complete and production-ready |
| Quotation lifecycle | `/quotations/request`, `/account/quotations` | `/admin/quotations` | QuotationRequest, Quotation, Item, Version, StatusHistory | Provisional → review → final → sent/expired/payment; deterministic server pricing and PDF | Complete and production-ready |
| Payment verification | proof form in account quotations | `/admin/payments` | PaymentSubmission, Verification, UploadedDocument, Payment | Private upload; ownership; one finance decision; serializable order activation | Complete and production-ready |
| Orders and delivery | `/account/orders`, order tracking | `/admin/orders`, order detail | Order, Item, Payment, StatusHistory, DeliveryTrackingEvent | Controlled forward transitions; customer/internal notes separated; cancellation requires finance-confirmed refund and releases reservations atomically | Complete and production-ready |
| Partnership programme | `/partners`, application and workspace | `/admin/partnerships/*` | Application, Partnership, Document, Review, Request, Offer, Benefit, Term | Approval-gated access; owner scoping; private evidence; offer-to-quotation conversion | Complete; optional messaging/track-change UX remains |
| Help desk and communications | `/contact`, newsletter/unsubscribe | help desk, email marketing/delivery | HelpDeskTicket, Subscriber, Campaign, Notification | Fail-closed required mail, delivery audit/retry, unsubscribe, customer/admin copies | Complete and production-ready |
| Content/reviews/promotions | policies and product reviews | content, reviews, promotions | Page, Banner, Review, Coupon | Permission checked, validated and audited mutations | Complete but additional browser testing recommended |
| Reporting/audit | customer status surfaces | dashboard, reports/CSV, audit log | AuditLog plus aggregate queries | Permission checked; bounded operational queries and CSV | Complete and production-ready |
| Integrations/jobs | generated PDFs and notifications | Syntech and operational queues | provider-specific records | Signed webhooks; protected OpenAI; authenticated quotation expiry cron | Complete; scheduling/monitoring is an external launch task |

## Documentation versus implementation

- The old Auth.js target was replaced by a sound custom opaque-session implementation. Documentation now records the actual model.
- Immediate checkout/payment plans were superseded by the approved quotation-led EFT workflow. They must not be restored.
- The partnership implementation exceeds the early phase plan and is preserved.
- Generic upload concerns were resolved by limiting the endpoint to authorised catalogue images; private business evidence uses purpose-specific storage actions.
- The earlier email “outbox” description implied queued delivery. Actual required email is synchronous/fail-closed and then durably recorded; failures are now also recorded for retry.
- Several planned account routes never existed. The current route map lists only implemented routes; customer order history was added during this audit.

## Confirmed findings and remediation

### Production blockers fixed

1. Fulfilment accepted arbitrary status jumps. A tested domain transition map now restricts next states.
2. Cancelling a paid order could strand reserved stock. Cancellation now requires both order and finance authority, explicit refund confirmation, and atomically refunds payment state, releases inventory, records movements/history/audit and cancels the converted quotation.
3. Soft-deleted active users could retain session access. Session resolution now rejects `deletedAt` users.
4. The catalogue upload endpoint accepted public document/archive types and exposed provider errors. It now accepts images only, stores under `catalogue/`, and returns a generic failure.
5. Audited transitive Sharp/PostCSS vulnerabilities were resolved with compatible package overrides while retaining the latest stable Next.js.

### Critical business and operational gaps fixed

- Added customer order history and an admin order detail/timeline.
- Replaced an ownership-incompatible admin tracking preview with an admin-safe operational record.
- Added registration, password-reset and newsletter abuse limits.
- Failed email attempts are durable and all system email types are visible/retryable in administration.
- The global long-request notice no longer re-enables a submit button while the server may still be mutating data.
- The main admin dashboard now includes actionable partnership, unassigned-request and help-desk queues.

## Security and integrity evidence

- Git-tracked environment files contain placeholders only; `.env` is not tracked.
- Production schema is current with all five migrations applied.
- Read-only production checks returned zero active soft-deleted users, over-reserved inventory rows, verified submissions without orders, active fulfilment orders without paid status, and unpaid final quotations past expiry.
- Private payment and partnership files use five-minute signed links after ownership/permission checks.
- Financial values use Prisma Decimal and server calculations. AI cannot supply financial values.
- High-impact actions use server permissions and audit/history records.
- Release verification passed ESLint, TypeScript, 42 unit tests, the optimized Next.js production build and `npm audit --omit=dev` with zero vulnerabilities.
- Build-time Google font downloads were removed; the UI now uses a system font stack so deployments do not depend on Google Fonts availability.

## Remaining recommendations (not production code blockers)

| Recommendation | Why deferred | Benefit | Complexity/dependency |
| --- | --- | --- | --- |
| Shared rate limiter | Current in-memory limiter is correct for one web instance | Safe horizontal scaling | Medium; Redis or managed equivalent |
| Background email worker | Required email is intentionally fail-closed per current business rule | Faster requests and scheduled retry | High; durable queue/worker and revised transaction policy |
| MFA for privileged users | Not required by current business decision | Stronger admin account security | Medium; enrolment/recovery policy |
| Partner messaging/track-change screens | Core request/offer workflow is operable through structured responses | Richer relationship collaboration | Medium |
| Browser E2E and accessibility automation | Unit/type/build gates cover domain risks; manual launch test still required | Regression confidence | Medium; Playwright/CI and test identities |
| Central error/APM alerts | Platform logs and health endpoint exist | Faster incident response | Low/medium; choose provider and alert ownership |

## Launch ownership

Code readiness does not prove external operations. Before public launch, an owner must verify Mailtrap domain delivery and suppression logs, schedule the authenticated expiry job, confirm Railway backups/restore access and alerts, test DNS/TLS, run the manual critical journey with production-like accounts, and record accessibility/Lighthouse baselines.
