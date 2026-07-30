import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const skuPrefix = "COMBO-TEST-";

const products = [
  {
    sku: `${skuPrefix}LAPTOP`,
    slug: "temporary-combo-test-laptop",
    name: "[TEST] Business Laptop",
    shortDescription: "Temporary catalogue item used only to test combo campaigns.",
    regularPrice: 12999,
    costPrice: 9200,
  },
  {
    sku: `${skuPrefix}MONITOR`,
    slug: "temporary-combo-test-monitor",
    name: "[TEST] Office Monitor",
    shortDescription: "Temporary catalogue item used only to test combo campaigns.",
    regularPrice: 3499,
    costPrice: 2350,
  },
] as const;

async function seed() {
  const category = await prisma.category.upsert({
    where: { slug: "temporary-combo-testing" },
    update: { name: "Temporary Combo Testing", isActive: true },
    create: {
      slug: "temporary-combo-testing",
      name: "Temporary Combo Testing",
      description: "Temporary test catalogue records. Do not use for customer orders.",
      isActive: true,
    },
  });

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        ...item,
        categoryId: category.id,
        salePrice: item.regularPrice,
        status: "PUBLISHED",
        stockStatus: "IN_STOCK",
        publishedAt: new Date(),
        deletedAt: null,
        isTestData: true,
      },
      create: {
        ...item,
        categoryId: category.id,
        salePrice: item.regularPrice,
        description: "Temporary test product for validating product combo campaign generation.",
        status: "PUBLISHED",
        stockStatus: "IN_STOCK",
        publishedAt: new Date(),
        isTestData: true,
      },
    });
    const inventory = await prisma.inventory.findFirst({ where: { productId: product.id, variantId: null } });
    if (inventory) {
      await prisma.inventory.update({ where: { id: inventory.id }, data: { onHand: 25, reserved: 0 } });
    } else {
      await prisma.inventory.create({ data: { productId: product.id, onHand: 25 } });
    }
  }

  console.log(`Seeded ${products.length} temporary combo test products.`);
}

async function remove() {
  const records = await prisma.product.findMany({
    where: { sku: { startsWith: skuPrefix }, isTestData: true },
    select: { id: true, _count: { select: { comboItems: true } } },
  });
  const inUse = records.filter((record) => record._count.comboItems > 0);
  if (inUse.length) throw new Error("Remove test combo campaigns before deleting their temporary products.");

  await prisma.product.deleteMany({ where: { id: { in: records.map((record) => record.id) } } });
  await prisma.category.deleteMany({
    where: { slug: "temporary-combo-testing", products: { none: {} } },
  });
  console.log(`Removed ${records.length} temporary combo test products.`);
}

async function main() {
  const shouldRemove = process.argv.includes("--remove");
  await (shouldRemove ? remove() : seed());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
