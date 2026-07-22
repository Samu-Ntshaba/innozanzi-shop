import { prisma } from "@/lib/prisma";
import { getEmailProvider, mailDeliveryMode, type EmailMessage } from "./provider";

// Required emails are fail-closed: delivery happens before any outbox write.
// Callers can therefore send first and only commit their business record after
// this function resolves successfully.
export async function enqueueEmail(message: EmailMessage, userId?: string) {
  const existing = await prisma.notification.findFirst({ where: { type: "EMAIL_OUTBOX", data: { path: ["idempotencyKey"], equals: message.idempotencyKey } } });
  const deliveryMode = mailDeliveryMode();
  const existingData = existing?.data && typeof existing.data === "object" && !Array.isArray(existing.data)
    ? existing.data as Record<string, unknown>
    : null;
  // A Sandbox acceptance is not a production delivery. Older records did not
  // store their transport, so they must also be sent again through the current
  // live provider before they may satisfy idempotency.
  if (existing?.status === "SENT" && deliveryMode !== "sandbox" && existingData?.deliveryMode === deliveryMode) return existing;
  if (existing?.status === "SENT" && deliveryMode === "sandbox" && existingData?.deliveryMode === "sandbox") return existing;

  let result: { messageId: string };
  try {
    result = await getEmailProvider().send(message);
  } catch (error) {
    const failureData = { to: message.to, text: message.text, idempotencyKey: message.idempotencyKey, deliveryMode };
    const failure = error instanceof Error ? error.message.slice(0, 2_000) : "Email provider rejected the message.";
    if (existing) {
      await prisma.notification.update({ where: { id: existing.id }, data: { userId: userId ?? existing.userId, subject: message.subject, body: message.html, data: failureData, status: "FAILED", sentAt: null, error: failure } });
    } else {
      await prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data: failureData, status: "FAILED", error: failure } });
    }
    throw error;
  }
  const data = { to: message.to, text: message.text, idempotencyKey: message.idempotencyKey, messageId: result.messageId, deliveryMode };

  if (existing) {
    return prisma.notification.update({ where: { id: existing.id }, data: { userId: userId ?? existing.userId, subject: message.subject, body: message.html, data, status: "SENT", sentAt: new Date(), error: null } });
  }
  return prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data, status: "SENT", sentAt: new Date() } });
}
