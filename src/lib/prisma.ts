import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

// Increment when a migration adds or removes Prisma models. Next.js development
// hot reload preserves globalThis, so an older client must not survive a schema change.
const PRISMA_SCHEMA_VERSION = "2026-07-22-partnership-management";

const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL);

if (!connectionString) {
  throw new Error("DATABASE_URL or DATABASE_PUBLIC_URL must be configured");
}

const adapter = new PrismaPg({ connectionString });

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
