# Innozanzi Shop

An empty Next.js starter using the App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

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
