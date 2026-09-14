import "dotenv/config";
import { retryPaidOrderNotifications } from "../src/domain/notifications/order-alerts";
import { retryFailedEmails } from "../src/integrations/email/outbox";
import { prisma } from "../src/lib/prisma";

async function main() {
  const paidOrders=await retryPaidOrderNotifications(Number(process.env.EMAIL_AUTOMATION_BATCH_SIZE ?? 50));
  if(paidOrders.failed)process.exitCode=1;
  console.info("Paid order communication recovery",paidOrders);
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
