import "dotenv/config";
import { retryFailedEmails } from "../src/integrations/email/outbox";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await retryFailedEmails(Number(process.env.EMAIL_AUTOMATION_BATCH_SIZE ?? 50));
  console.info("Scheduled email automation completed", result);
  if (result.failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Scheduled email automation failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
