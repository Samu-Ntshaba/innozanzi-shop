# Innozanzi Shop architecture

## Scope and principles

Innozanzi Shop is a modular monolith deployed as one Next.js application with PostgreSQL as the source of truth. This keeps transactions, authorization, and operations simple while preserving clear domain boundaries that can be extracted later if scale demands it.

The application serves three surfaces:

- Public storefront for catalogue discovery and quotation-list submission; there is no immediate-payment checkout.
- Customer account for orders, quotations, addresses, wishlist, and documents.
- Protected administration portal for catalogue, inventory, fulfilment, finance, content, reporting, and access control.

Core rules:

- Server Components read data directly through domain query modules.
- Server Actions handle authenticated first-party mutations; Route Handlers handle webhooks, uploads, downloads, integrations, and public API boundaries.
- UI components never contain pricing, stock, permission, or payment decisions.
- PostgreSQL serializable transactions protect payment verification, inventory reservation, one-time order activation and fulfilment transitions.

The binding transaction boundary is payment verification. Requests and quotations do not reserve stock. An authorised finance decision verifies current availability, reserves stock, records payment verification and creates the immutable order snapshot atomically.
- All money is stored as `Decimal(19, 4)` and rounded through shared decimal utilities. Browser totals are display-only.
- All timestamps are stored in UTC and displayed in `Africa/Johannesburg`.

## Partnership management

Partnership management is another domain inside the same modular monolith and identity boundary. A partner is always an existing verified customer; approval adds a `Partnership` record and workspace access to that user instead of creating a second account.

- `PartnershipApplication` owns the resumable application, sections and private evidence. `activeKey` provides a database-enforced single-active-application guard.
- `Partnership` is created only by an authorised approval decision and owns benefits, negotiated terms, reviews, requests and messages.
- Partner requests and offers retain public and internal fields separately. Customer queries explicitly exclude internal messages and supplier notes.
- Accepting an offer creates a snapshot in the existing quotation workflow. It does not create a paid order or bypass payment verification.
- Partnership documents use the existing private Supabase bucket and authorised signed-download endpoint.
- Every lifecycle mutation writes status history and an audit log in the same database transaction. Email is queued before state commits where the customer must not be told a change succeeded unless notification was accepted by the mail outbox.

## Runtime architecture

```text
Browser
  -> Next.js App Router
       -> Server Components / Server Actions / Route Handlers
            -> Authentication and authorization policy layer
            -> Zod input schemas
            -> Domain services
                 -> Prisma repositories -> PostgreSQL
                 -> Storage provider -> Supabase Storage / future S3
                 -> Email provider -> Resend / SendGrid / SMTP
                 -> Payment provider -> Paystack / Yoco / EFT
            -> Audit and notification services
```

## Source layout

```text
src/
  app/
    (store)/              public storefront routes
    (auth)/               sign-in, registration, verification and recovery
    account/              authenticated customer routes
    admin/                protected administration layout and pages
    api/                  webhooks, uploads, downloads and integration routes
  components/
    ui/                   shadcn/ui primitives
    store/                storefront composition components
    admin/                admin composition components
    forms/                shared form components
  domain/
    auth/                 identity, sessions, RBAC and policies
    catalogue/            products, variants, categories and brands
    cart/                 cart lifecycle and calculations
    checkout/             order creation and stock reservation
    inventory/            stock ledger and availability
    orders/               order state machine and fulfilment
    payments/             payment abstraction and state transitions
    quotations/           request, quote and conversion workflows
    promotions/           coupon eligibility and discount calculation
    customers/            profiles, companies and addresses
    reviews/              moderation and verified-purchase checks
    content/              banners, pages and settings
    reporting/            reporting queries and CSV exports
  integrations/
    storage/              provider contract and implementations
    email/                provider contract, templates and implementations
    payments/             Paystack, Yoco and EFT implementations
    openai/               optional server-only AI integration
  lib/                    database, environment, logging and shared utilities
  schemas/                reusable Zod contracts
  styles/                 shared design tokens when needed
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/
  integration/
e2e/
```

Domain modules may import `lib`, `schemas`, and integration contracts. App routes call domain modules. Domain modules must not import React components or route files.

## Rendering and caching

- Marketing pages, categories, and published product pages use server rendering with tag-based revalidation.
- Search and filters use URL search parameters and indexed database queries.
- Cart, account, checkout, admin, inventory, and payment views are dynamic and never publicly cached.
- Product/category mutations revalidate affected tags and paths.
- Images use `next/image`; Supabase’s hostname is allow-listed explicitly.
- Lists use cursor pagination where records change frequently and page pagination where stable navigation/SEO matters.

## Authentication and authorization

Authentication uses custom database-backed opaque sessions. The browser receives a 256-bit random `HttpOnly`, `SameSite=Lax`, production-secure cookie; PostgreSQL stores only its SHA-256 hash. Credentials use Argon2id, verified email and generic recovery responses. Every session lookup rejects expired sessions and non-active, suspended, disabled or soft-deleted users.

Authorization is enforced in domain services and protected route layouts. Permission evaluation is:

1. Super Administrator bypass, unless the account itself is disabled.
2. Collect direct and role-derived grants for the user.
3. Any explicit deny for the requested permission wins.
4. Otherwise at least one allow is required.

Admin pages provide navigation convenience only; every read and mutation repeats the permission check server-side.

## Provider abstractions

### Storage

`StorageProvider` supports upload, delete, public URL, signed URL, and metadata inspection. Product images, brand logos, and banners may be public. Proofs of payment, quotation attachments, invoices, and private documents require signed access after an ownership or permission check.

### Payments

`PaymentProvider` supports payment initialization, callback verification, refund requests, and normalized status mapping. Provider callbacks are signature-verified and idempotent. EFT is implemented as a provider with manual review rather than special-cased checkout logic.

### Email

`EmailProvider` accepts a normalized message and template result. Templates render both HTML and plain text. Required delivery is currently synchronous and fail-closed where business records must not be saved after provider rejection. Successes and failures are durably recorded and retryable. A background worker remains an optional future change that requires an explicit business decision about transaction semantics.

## Operational boundaries

- Structured logs include request or operation IDs but never secrets or full payment data.
- Sensitive mutations write immutable audit records with actor, action, target, before/after summaries, IP, and user agent.
- Health checks distinguish application liveness from dependency readiness.
- Payment and email integrations use idempotency keys and retry-safe handlers.
- Database backups, secret rotation, dependency updates, and restore drills are deployment responsibilities documented before launch.
