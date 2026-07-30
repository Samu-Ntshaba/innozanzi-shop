import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL;
if (!connectionString) throw new Error("A database URL is required.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const artworkPath = "/images/combos/test-business-workspace-bundle.png";

async function main() {
  const campaign = await prisma.comboCampaign.findFirst({
    where: {
      items: { some: { product: { sku: { startsWith: "COMBO-TEST-" } } } },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  if (!campaign) throw new Error("No combo campaign using the temporary test products was found.");

  await prisma.comboCampaign.update({
    where: { id: campaign.id },
    data: { imageUrl: artworkPath, mobileImageUrl: artworkPath },
  });
  console.log(`Applied combined artwork to "${campaign.name}" (${campaign.id}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
