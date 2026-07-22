import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/domain/auth/permissions";
import { hashPassword } from "../src/domain/auth/password";

const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database URL is required to seed.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const roles = [
  ["Super Administrator", "super-administrator"],
  ["Administrator", "administrator"],
  ["Sales", "sales"],
  ["Finance", "finance"],
  ["Inventory Manager", "inventory-manager"],
  ["Content Manager", "content-manager"],
  ["Support Agent", "support-agent"],
  ["Customer", "customer"],
] as const;

const rolePermissions: Record<string, readonly (typeof PERMISSIONS)[number][]> = {
  "super-administrator": PERMISSIONS,
  administrator: PERMISSIONS.filter((key) => key !== "users.manage"),
  sales: ["products.view", "orders.view", "orders.update", "quotations.manage", "customers.manage", "partnership.view", "partnership.application.review", "partnership.request.view", "partnership.request.manage"],
  finance: ["orders.view", "payments.approve", "reports.view"],
  "inventory-manager": ["products.view", "products.update", "inventory.manage"],
  "content-manager": ["products.view", "products.update"],
  "support-agent": ["orders.view", "customers.manage", "partnership.view", "partnership.request.view"],
  customer: [],
};

const categories = [
  ["Laptops", "laptops"], ["Desktop Computers", "desktop-computers"], ["Monitors", "monitors"],
  ["Keyboards and Mice", "keyboards-and-mice"], ["Headsets", "headsets"], ["UPS and Power", "ups-and-power"],
  ["Networking", "networking"], ["Printers", "printers"], ["Storage", "storage"],
  ["PC Components", "pc-components"], ["Software Licences", "software-licences"],
] as const;

const brands = ["Dell", "HP", "Lenovo", "ASUS", "Acer", "Logitech", "APC", "Eaton", "Syntech", "Microsoft", "TP-Link", "Ubiquiti"] as const;

const products = [
  ["Dell Latitude 3550 Business Laptop", "dell-latitude-3550-business-laptop", "INZ-DELL-LAT3550", "Dell", "laptops", "18999.00", 12, true, true],
  ["HP ProBook 450 15-inch Laptop", "hp-probook-450-15-inch-laptop", "INZ-HP-PB450", "HP", "laptops", "17499.00", 9, true, false],
  ["Lenovo ThinkPad E14 Work Laptop", "lenovo-thinkpad-e14-work-laptop", "INZ-LEN-E14", "Lenovo", "laptops", "16499.00", 14, false, true],
  ["ASUS ExpertBook Essential Laptop", "asus-expertbook-essential-laptop", "INZ-ASUS-EB", "ASUS", "laptops", "12999.00", 8, false, false],
  ["Acer Aspire 5 Everyday Laptop", "acer-aspire-5-everyday-laptop", "INZ-ACER-A5", "Acer", "laptops", "11999.00", 10, false, false],
  ["Dell OptiPlex Compact Office Desktop", "dell-optiplex-compact-office-desktop", "INZ-DELL-OPT", "Dell", "desktop-computers", "15499.00", 7, true, false],
  ["HP Pro Tower Business Desktop", "hp-pro-tower-business-desktop", "INZ-HP-PTOWER", "HP", "desktop-computers", "14999.00", 6, false, true],
  ["Dell 24-inch Full HD Business Monitor", "dell-24-full-hd-business-monitor", "INZ-DELL-M24", "Dell", "monitors", "3299.00", 24, true, false],
  ["Lenovo 27-inch QHD Professional Monitor", "lenovo-27-qhd-professional-monitor", "INZ-LEN-M27", "Lenovo", "monitors", "5499.00", 11, false, true],
  ["Logitech MK540 Wireless Keyboard and Mouse", "logitech-mk540-wireless-keyboard-mouse", "INZ-LOGI-MK540", "Logitech", "keyboards-and-mice", "1099.00", 35, true, false],
  ["Logitech Zone Wired Business Headset", "logitech-zone-wired-business-headset", "INZ-LOGI-ZONE", "Logitech", "headsets", "1799.00", 18, false, true],
  ["APC Easy UPS 1200VA", "apc-easy-ups-1200va", "INZ-APC-1200", "APC", "ups-and-power", "2499.00", 16, true, false],
  ["Eaton 5E 1600VA Line Interactive UPS", "eaton-5e-1600va-ups", "INZ-EATON-1600", "Eaton", "ups-and-power", "3699.00", 9, false, false],
  ["Syntech 600W Portable Power Station", "syntech-600w-portable-power-station", "INZ-SYN-PS600", "Syntech", "ups-and-power", "8999.00", 5, false, true],
  ["TP-Link Wi-Fi 6 Business Router", "tp-link-wifi-6-business-router", "INZ-TPL-AX3000", "TP-Link", "networking", "2199.00", 20, true, false],
  ["Ubiquiti UniFi Indoor Access Point", "ubiquiti-unifi-indoor-access-point", "INZ-UBI-UAP", "Ubiquiti", "networking", "3499.00", 13, false, true],
  ["HP LaserJet Pro Office Printer", "hp-laserjet-pro-office-printer", "INZ-HP-LJPRO", "HP", "printers", "6499.00", 6, true, false],
  ["Syntech 1TB Portable Solid State Drive", "syntech-1tb-portable-ssd", "INZ-SYN-SSD1T", "Syntech", "storage", "1999.00", 22, false, true],
  ["Microsoft 365 Business Standard Annual Licence", "microsoft-365-business-standard-annual", "INZ-MS-M365BS", "Microsoft", "software-licences", "2899.00", 999, true, false],
  ["Microsoft Windows 11 Pro Digital Licence", "microsoft-windows-11-pro-digital-licence", "INZ-MS-W11PRO", "Microsoft", "software-licences", "3499.00", 999, false, true],
] as const;

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

  const categoryIds = new Map<string, string>();
  for (const [name, slug] of categories) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true, description: `Professional ${name.toLowerCase()} selected for South African homes and organisations.` },
    });
    categoryIds.set(slug, category.id);
  }

  const brandIds = new Map<string, string>();
  for (const name of brands) {
    const slug = name.toLowerCase().replaceAll(" ", "-");
    const brand = await prisma.brand.upsert({ where: { slug }, update: { name, isActive: true }, create: { name, slug, isActive: true } });
    brandIds.set(name, brand.id);
  }

  for (const [name, slug, sku, brandName, categorySlug, regularPrice, stock, featured, isNew] of products) {
    const product = await prisma.product.upsert({
      where: { sku },
      update: { name, slug, regularPrice, status: "PUBLISHED", stockStatus: stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK" },
      create: {
        name, slug, sku, regularPrice,
        brandId: brandIds.get(brandName),
        categoryId: categoryIds.get(categorySlug)!,
        shortDescription: `${name} supplied with local assistance, transparent VAT-inclusive pricing and dependable fulfilment.`,
        description: `Designed for dependable day-to-day use, ${name} is a practical choice for South African customers who value clear specifications, warranty support and responsive service. Contact Innozanzi for volume pricing, configuration or deployment assistance.`,
        status: "PUBLISHED", stockStatus: "IN_STOCK", vatStatus: "TAXABLE", isFeatured: featured, isNew, isPopular: featured,
        publishedAt: new Date(), warranty: "Standard supplier warranty", deliveryEstimate: "2–5 business days",
      },
    });
    const inventory = await prisma.inventory.findFirst({ where: { productId: product.id, variantId: null } });
    if (inventory) await prisma.inventory.update({ where: { id: inventory.id }, data: { onHand: stock, reorderLevel: 3 } });
    else await prisma.inventory.create({ data: { productId: product.id, onHand: stock, reorderLevel: 3 } });
  }
}

main().finally(() => prisma.$disconnect());
