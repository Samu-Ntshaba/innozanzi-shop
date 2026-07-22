# Innozanzi Shop

An empty Next.js starter using the App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL, and Supabase Storage.

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
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate` — create and apply a development migration
- `npm run db:studio` — open Prisma Studio

`DATABASE_PUBLIC_URL` is used by local Prisma commands and local development.
`DATABASE_URL` is the private Railway connection used inside Railway's network.

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` to enable uploads. The server creates the configured public bucket on the first upload. Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable.
