# Innozanzi Shop architecture

## Scope and principles

Innozanzi Shop is a modular monolith deployed as one Next.js application with PostgreSQL as the source of truth. This keeps transactions, authorization, and operations simple while preserving clear domain boundaries that can be extracted later if scale demands it.

The application serves three surfaces:

- Public storefront for catalogue discovery, cart, checkout, and quotation requests.
- Customer account for orders, quotations, addresses, wishlist, and documents.
- Protected administration portal for catalogue, inventory, fulfilment, finance, content, reporting, and access control.

Core rules:

- Server Components read data directly through domain query modules.
- Server Actions handle authenticated first-party mutations; Route Handlers handle webhooks, uploads, downloads, integrations, and public API boundaries.
- UI components never contain pricing, stock, permission, or payment decisions.
- PostgreSQL transactions protect checkout, inventory reservation, payment transitions, cancellation, refunds, and quotation conversion.
- All money is stored as `Decimal(19, 4)` and rounded through shared decimal utilities. Browser totals are display-only.
- All timestamps are stored in UTC and displayed in `Africa/Johannesburg`.

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

Auth.js with Prisma-backed sessions is the preferred implementation. Credentials authentication uses Argon2id password hashes, verified email, secure `HttpOnly` cookies, session rotation, and generic recovery responses to prevent account discovery.

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

`EmailProvider` accepts a normalized message and template result. Templates render both HTML and plain text. Sending should move to an outbox/worker once infrastructure is available; order transactions never depend on a synchronous email provider response.

## Operational boundaries

- Structured logs include request or operation IDs but never secrets or full payment data.
- Sensitive mutations write immutable audit records with actor, action, target, before/after summaries, IP, and user agent.
- Health checks distinguish application liveness from dependency readiness.
- Payment and email integrations use idempotency keys and retry-safe handlers.
- Database backups, secret rotation, dependency updates, and restore drills are deployment responsibilities documented before launch.
