import { refreshHomepageShowcase } from "../src/domain/catalogue/queries";
import { prisma } from "../src/lib/prisma";

refreshHomepageShowcase()
  .then(result => console.log(JSON.stringify(result)))
  .catch(error => {
    console.error("Homepage merchandising refresh failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
