# Innozanzi Shop

A production-oriented e-commerce platform for Innozanzi (Pty) Ltd, built with the Next.js App Router, TypeScript, Tailwind CSS, Prisma and PostgreSQL.

## Architecture documentation

- [Architecture](docs/architecture.md)
- [Route map](docs/routes.md)
- [Target data model](docs/data-model.md)
- [Delivery plan, assumptions and risks](docs/delivery-plan.md)

Implementation is intentionally delivered through reviewable phase gates. Phase 1 documents the target system; Phase 2 replaces the current scaffold schema with authentication, RBAC and foundational commerce domains.

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run lint` — run ESLint
- `npm test` — run unit tests
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — create and apply a development migration
- `npm run db:seed` — seed system roles, permissions and the optional administrator
- `npm run db:studio` — open Prisma Studio

`DATABASE_PUBLIC_URL` is used by local Prisma commands and local development.
`DATABASE_URL` is the private Railway connection used inside Railway's network.

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` to enable uploads. The server creates the configured public bucket on the first upload. Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable.

Set `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_ROUTE_SECRET` to enable the protected `POST /api/openai` route. Send JSON shaped as `{ "input": "..." }` with an `Authorization: Bearer <OPENAI_ROUTE_SECRET>` header. Keep both secrets server-only.

## Authentication and administration

Authentication uses Argon2id password hashes and opaque session cookies. Only a SHA-256 hash of each session token is stored in PostgreSQL. Configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`, then run `npm run db:seed` to create or update the initial Super Administrator. The `/admin` layout enforces permissions on the server.

New customer accounts remain pending until email verification. The verification token is created during registration; delivery will be connected through the email provider in the integrations phase.

## Storefront foundation

The current Phase 3 slice includes the branded homepage, catalogue filters, category/product pages, server-authoritative ZAR pricing, VAT-inclusive cart calculations, persistent anonymous/customer carts, and server-side stock validation. The seed command creates the required categories, brands, and 20 original sample products.
