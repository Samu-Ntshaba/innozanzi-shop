import webpush from "web-push";
import { prisma } from "@/lib/prisma";

type PushMessage = { title: string; body: string; url: string; tag: string };

function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@innozanzi.co.za", publicKey, privateKey);
  return true;
}

export async function sendMobileAdminPush(message: PushMessage) {
  if (!configured()) return;
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { user: { status: "ACTIVE", deletedAt: null, roles: { some: { role: { slug: { in: ["mobile-admin", "super-administrator"] } } } } } },
    });
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(message));
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        else console.error("Mobile Admin push failed", error);
      }
    }));
  } catch (error) {
    console.error("Mobile Admin push delivery failed", error);
  }
}
