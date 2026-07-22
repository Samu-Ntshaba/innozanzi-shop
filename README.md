# Innozanzi Shop

An empty Next.js starter using the App Router, TypeScript, Tailwind CSS, and Prisma.

## Setup

```bash
cp .env.example .env
npm install
npm run db:migrate -- --name init
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
