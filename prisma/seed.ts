import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/domain/auth/permissions";
import { hashPassword } from "../src/domain/auth/password";
import { testDatabaseUrl } from "../src/lib/test-mode";

const connectionString = testDatabaseUrl(process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL ?? "");
if (!connectionString) throw new Error("A database URL is required to seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const roles = [
  ["Super Administrator", "super-administrator"],
  ["Administrator", "administrator"],
  ["Sales", "sales"],
  ["Finance", "finance"],
  ["Inventory Manager", "inventory-manager"],
  ["Content Manager", "content-manager"],
  ["Marketing", "marketing"],
  ["Support Agent", "support-agent"],
  ["Procurement Officer", "procurement-officer"],
  ["Returns Manager", "returns-manager"],
  ["Technician", "technician"],
  ["Customer", "customer"],
] as const;

const rolePermissions: Record<string, readonly (typeof PERMISSIONS)[number][]> = {
  "super-administrator": PERMISSIONS,
  administrator: PERMISSIONS.filter((key) => key !== "users.manage" && key !== "rfq.approve" && key !== "rfq.commission.manage" && key !== "returns.refund.approve" && key !== "returns.refund.confirm"),
  sales: ["products.view", "orders.view", "orders.update", "quotations.manage", "customers.manage", "partnership.view", "partnership.application.review", "partnership.request.view", "partnership.request.manage", "rfq.view", "rfq.create", "rfq.update", "rfq.analyse", "rfq.price", "rfq.submit", "rfq.assign", "rfq.financials.view","documents.download","documents.send","documents.history.view","documents.resend"],
  finance: ["orders.view", "payments.approve", "reports.view", "rfq.view", "rfq.price", "rfq.approve", "rfq.reject", "rfq.financials.view", "rfq.commission.manage","documents.download","documents.send","documents.history.view","documents.resend","returns.view","returns.refund.pay","returns.refund.confirm","returns.financial.view"],
  "inventory-manager": ["products.view", "products.update", "inventory.manage"],
  "content-manager": ["products.view", "products.update"],
  marketing: ["products.view","marketing.dashboard.view","marketing.seo.view","marketing.seo.edit","marketing.seo.publish","marketing.content.view","marketing.content.edit","marketing.content.publish","marketing.content.delete","marketing.media.manage","marketing.redirects.manage","marketing.analytics.view"],
  "support-agent": ["orders.view", "customers.manage", "partnership.view", "partnership.request.view"],
  "procurement-officer": ["products.view", "orders.view", "orders.update", "quotations.manage", "inventory.manage", "customers.manage", "rfq.view", "rfq.create", "rfq.update", "rfq.price", "rfq.submit", "rfq.assign", "rfq.financials.view","documents.download","documents.send","documents.history.view","documents.resend"],
  "returns-manager": ["orders.view","customers.manage","inventory.manage","returns.view","returns.create","returns.review","returns.request-information","returns.assign-technician","returns.inspections.review","returns.repair.approve","returns.replacement.approve","returns.refund.approve","returns.reject","returns.claims.manage","returns.inventory.classify","returns.resale.create","returns.resale.approve","returns.policy.manage","returns.reasons.manage","returns.financial.view","returns.documents.download","returns.documents.send"],
  technician: ["returns.view","returns.inspections.assigned","returns.inspections.perform"],
  customer: [],
};

const categories = [
  ["Laptops", "laptops"], ["Desktop Computers", "desktop-computers"], ["Monitors", "monitors"],
  ["Keyboards and Mice", "keyboards-and-mice"], ["Headsets", "headsets"], ["UPS and Power", "ups-and-power"],
  ["Networking", "networking"], ["Printers", "printers"], ["Storage", "storage"],
  ["PC Components", "pc-components"], ["Software Licences", "software-licences"],
] as const;

const brands = ["Dell", "HP", "Lenovo", "ASUS", "Acer", "Logitech", "APC", "Eaton", "Syntech", "Microsoft", "TP-Link", "Ubiquiti"] as const;

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const [name, slug] of roles) {
    await prisma.role.upsert({ where: { slug }, update: { name }, create: { name, slug, isSystem: true } });
  }

  const partnershipTypes = [
    { track: "ECOMMERCE" as const, name: "E-commerce Partner", description: "For verified businesses and individuals actively selling through recognised online channels.", benefits: "Structured sourcing requests, controlled partner pricing, stock and lead-time responses, and negotiated offers.", eligibilitySummary: "Active online sales evidence, verified business/contact details and required compliance documents.", requiredDocumentTypes: ["CIPC_REGISTRATION", "BANKING_CONFIRMATION", "MARKETPLACE_SELLER_EVIDENCE", "SALES_EVIDENCE"] },
    { track: "BUSINESS_PROCUREMENT" as const, name: "Business Procurement Partner", description: "For established organisations that need an ongoing, structured procurement relationship.", benefits: "Direct and recurring requests, assigned account management, structured responses, alternatives and faster procurement workflows.", eligibilitySummary: "Verified company profile, procurement requirements, representative authority and core compliance documents.", requiredDocumentTypes: ["CIPC_REGISTRATION", "PROOF_OF_ADDRESS", "BUSINESS_PROFILE", "TAX_COMPLIANCE"] },
    { track: "GROWTH" as const, name: "Growth Partner", description: "For developing businesses building a verified, long-term sourcing relationship with Innozanzi.", benefits: "Guided sourcing, product recommendations, selected opportunities and a pathway to advanced tracks.", eligibilitySummary: "Verified business identity, profile, purchasing expectations and foundational compliance evidence.", requiredDocumentTypes: ["CIPC_REGISTRATION", "PROOF_OF_ADDRESS", "BUSINESS_PROFILE"] },
  ];
  for (const type of partnershipTypes) await prisma.partnershipType.upsert({ where: { track: type.track }, update: type, create: type });

  const storedRoles = await prisma.role.findMany({ select: { id: true, slug: true } });
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  for (const role of storedRoles) {
    const allowed = new Set(rolePermissions[role.slug] ?? []);
    await prisma.rolePermission.createMany({
      data: permissions
        .filter(({ key }) => allowed.has(key as (typeof PERMISSIONS)[number]))
        .map(({ id }) => ({ roleId: role.id, permissionId: id, effect: "ALLOW" })),
      skipDuplicates: true,
    });
  }

  const superRole = await prisma.role.findUniqueOrThrow({ where: { slug: "super-administrator" } });

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    const user = await prisma.user.upsert({
      where: { email },
      update: { status: "ACTIVE", emailVerified: new Date() },
      create: {
        email,
        name: process.env.ADMIN_NAME ?? "Shop Administrator",
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
      update: {},
      create: { userId: user.id, roleId: superRole.id },
    });
  }

  for (const [name, slug] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true, description: `Professional ${name.toLowerCase()} selected for South African homes and organisations.` },
    });
  }

  for (const name of brands) {
    const slug = name.toLowerCase().replaceAll(" ", "-");
    await prisma.brand.upsert({ where: { slug }, update: { name, isActive: true }, create: { name, slug, isActive: true } });
  }
}

main().finally(() => prisma.$disconnect());
