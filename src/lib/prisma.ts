import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { testDatabaseUrl } from "@/lib/test-mode";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

// Keep this aligned with the latest migration. It is intentionally referenced by
// application source so Next/Railway cannot reuse a server bundle containing an
// older generated Prisma runtime after the schema changes.
const PRISMA_SCHEMA_VERSION = "2026-07-24-logistics-transport-management";

const connectionString =
  process.env.RAILWAY_ENVIRONMENT
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error("DATABASE_URL or DATABASE_PUBLIC_URL must be configured");
}

const adapter = new PrismaPg({ connectionString:testDatabaseUrl(connectionString) });

const cachedPrisma = globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
  ? globalForPrisma.prisma
  : undefined;

if (globalForPrisma.prisma && !cachedPrisma) {
  void globalForPrisma.prisma.$disconnect();
}

export const prisma =
  cachedPrisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
