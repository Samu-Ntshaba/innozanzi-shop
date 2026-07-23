# Innozanzi Shop

A production-oriented quotation, payment-verification and fulfilment platform for Innozanzi (Pty) Ltd, built with the Next.js App Router, TypeScript, Tailwind CSS, Prisma and PostgreSQL. Customers request products; they do not pay during checkout.

## Architecture documentation

- [Architecture](docs/architecture.md)
- [Route map](docs/routes.md)
- [Target data model](docs/data-model.md)
- [Delivery plan, assumptions and risks](docs/delivery-plan.md)
- [Quotation-to-delivery implementation progress](docs/quotation-lifecycle-progress.md)
- [Final production-readiness audit](docs/system-audit-2026-07-23.md)
- [Isolated production Test Mode](docs/test-mode-runbook.md)

The current implementation includes authentication/RBAC, catalogue and inventory, quotation-to-delivery operations, CRM communications, reporting and partnership management. Historical phase documents are retained for decision context; the final audit describes the current system.

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

- `npm run dev` — open/reuse a Railway SSH database tunnel and start the development server
- `npm run dev:direct` — start without a tunnel when PostgreSQL is directly reachable
- `npm run build` — create a production build
- `npm run lint` — run ESLint
- `npm test` — run unit tests
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — create and apply a development migration
- `npm run db:seed` — seed system roles, permissions and the optional administrator
- `npm run db:studio` — open Prisma Studio

`DATABASE_PUBLIC_URL` is used by local Prisma commands and local development.
`DATABASE_URL` is the private Railway connection used inside Railway's network.
The default development command requires an authenticated Railway CLI session and
uses `RAILWAY_DB_TUNNEL_PORT` (default `15432`) to avoid unreliable public TCP proxy
connections. Run `railway login` once if the tunnel reports that authentication is required.

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` to enable uploads. The server creates the configured public bucket on the first upload. Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable.

Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_ROUTE_SECRET` to enable the protected `POST /api/openai` route. Send JSON shaped as `{ "input": "..." }` with an `Authorization: Bearer <OPENAI_ROUTE_SECRET>` header. Keep both secrets server-only.

## Authentication and administration

Authentication uses Argon2id password hashes and opaque session cookies. Only a SHA-256 hash of each session token is stored in PostgreSQL. Disabled, suspended and soft-deleted users are rejected on every session lookup. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, then run the seed only in an environment where its full catalogue/bootstrap effects are intended. Use `scripts/upsert-super-admin.ts` for narrowly scoped administrator bootstrap.

Transactional email uses Mailtrap Email Sending. Configure `MAILTRAP_API_TOKEN`, `MAILTRAP_DELIVERY_MODE`, `MAIL_FROM_EMAIL` (a verified sending-domain address), `MAIL_FROM_NAME`, `EMAIL_DARK_HEADER_LOGO_URL`, `SUPPORT_EMAIL`, `EMAIL_UNSUBSCRIBE_SECRET`, and `NEXT_PUBLIC_SITE_URL`. Required delivery is immediate and fail-closed for the associated business submission. Successes and failures are recorded in `Notification`; authorised staff can retry failures from email administration. Sandbox is ignored on production/Railway. Without credentials, only local development falls back to console delivery.

New customer accounts remain pending until they use the emailed verification link. Password resets, quotation lifecycle messages, invoices, order status changes, and payment-proof decisions use shared branded templates.

## Storefront foundation

The current Phase 3 slice includes the branded homepage, catalogue filters, category/product pages, server-authoritative ZAR pricing, VAT-inclusive cart calculations, persistent anonymous/customer carts, and server-side stock validation. The seed command creates the required categories, brands, and 20 original sample products.
