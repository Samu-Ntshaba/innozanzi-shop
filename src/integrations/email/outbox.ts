import { prisma } from "@/lib/prisma";
import { getEmailProvider, type EmailMessage } from "./provider";

// Required emails are fail-closed: delivery happens before any outbox write.
// Callers can therefore send first and only commit their business record after
// this function resolves successfully.
export async function enqueueEmail(message: EmailMessage, userId?: string) {
  const existing = await prisma.notification.findFirst({ where: { type: "EMAIL_OUTBOX", data: { path: ["idempotencyKey"], equals: message.idempotencyKey } } });
  if (existing?.status === "SENT") return existing;

  const result = await getEmailProvider().send(message);
  const data = { to: message.to, text: message.text, idempotencyKey: message.idempotencyKey, messageId: result.messageId };

  if (existing) {
    return prisma.notification.update({ where: { id: existing.id }, data: { userId: userId ?? existing.userId, subject: message.subject, body: message.html, data, status: "SENT", sentAt: new Date(), error: null } });
  }
  return prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data, status: "SENT", sentAt: new Date() } });
}
