import "dotenv/config";
import { retryPaidOrderNotifications } from "../src/domain/notifications/order-alerts";
import { retryFailedEmails } from "../src/integrations/email/outbox";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    if(!process.env.NEXT_PUBLIC_SITE_URL||!process.env.CRON_SECRET)throw new Error("Recovery endpoint configuration missing");
    const response=await fetch(new URL("/api/cron/reconcile-payments",process.env.NEXT_PUBLIC_SITE_URL),{method:"POST",headers:{Authorization:`Bearer ${process.env.CRON_SECRET}`},signal:AbortSignal.timeout(300000)});
    if(!response.ok)throw new Error("Recovery endpoint unavailable");
    console.info("Payment reconciliation",await response.json());
  }
  catch { console.error("Payment reconciliation failed; the next scheduled run will retry.");process.exitCode=1; }
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
