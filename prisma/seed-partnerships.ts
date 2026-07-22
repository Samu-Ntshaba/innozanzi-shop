import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/domain/auth/permissions";

const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const types = [
  { track: "ECOMMERCE" as const, name: "E-commerce Partner", description: "For verified businesses and individuals actively selling through recognised online channels.", benefits: "Structured sourcing requests, controlled partner pricing, stock and lead-time responses, and negotiated offers.", eligibilitySummary: "Active online sales evidence, verified business/contact details and required compliance documents.", requiredDocumentTypes: ["CIPC_REGISTRATION", "BANKING_CONFIRMATION", "MARKETPLACE_SELLER_EVIDENCE", "SALES_EVIDENCE"] },
  { track: "BUSINESS_PROCUREMENT" as const, name: "Business Procurement Partner", description: "For established organisations that need an ongoing, structured procurement relationship.", benefits: "Direct and recurring requests, assigned account management, structured responses, alternatives and faster procurement workflows.", eligibilitySummary: "Verified company profile, procurement requirements, representative authority and core compliance documents.", requiredDocumentTypes: ["CIPC_REGISTRATION", "PROOF_OF_ADDRESS", "BUSINESS_PROFILE", "TAX_COMPLIANCE"] },
  { track: "GROWTH" as const, name: "Growth Partner", description: "For developing businesses building a verified, long-term sourcing relationship with Innozanzi.", benefits: "Guided sourcing, product recommendations, selected opportunities and a pathway to advanced tracks.", eligibilitySummary: "Verified business identity, profile, purchasing expectations and foundational compliance evidence.", requiredDocumentTypes: ["CIPC_REGISTRATION", "PROOF_OF_ADDRESS", "BUSINESS_PROFILE"] },
];

async function main() {
  const partnershipPermissions = PERMISSIONS.filter((key) => key.startsWith("partnership."));
  for (const key of partnershipPermissions) await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  for (const type of types) await prisma.partnershipType.upsert({ where: { track: type.track }, update: type, create: type });

  const roles = await prisma.role.findMany({ where: { slug: { in: ["super-administrator", "administrator", "sales", "support-agent"] } } });
  const permissions = await prisma.permission.findMany({ where: { key: { in: partnershipPermissions } } });
  for (const role of roles) {
    const keys = role.slug === "support-agent"
      ? new Set(["partnership.view", "partnership.request.view"])
      : role.slug === "sales"
        ? new Set(["partnership.view", "partnership.application.review", "partnership.request.view", "partnership.request.manage"])
        : new Set(partnershipPermissions);
    await prisma.rolePermission.createMany({
      data: permissions.filter((permission) => keys.has(permission.key)).map((permission) => ({ roleId: role.id, permissionId: permission.id, effect: "ALLOW" as const })),
      skipDuplicates: true,
    });
  }
}

main().finally(() => prisma.$disconnect());
