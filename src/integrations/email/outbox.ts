import { prisma } from "@/lib/prisma";
import { getEmailProvider, type EmailMessage } from "./provider";

export async function enqueueEmail(message: EmailMessage, userId?: string) {
  const existing = await prisma.notification.findFirst({ where: { type: "EMAIL_OUTBOX", data: { path: ["idempotencyKey"], equals: message.idempotencyKey } } });
  if (existing?.status === "SENT") return existing;
  const notification = existing ?? await prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data: { to: message.to, text: message.text, idempotencyKey: message.idempotencyKey }, status: "PENDING" } });
  try {
    const result = await getEmailProvider().send(message);
    return await prisma.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date(), data: { to: message.to, text: message.text, idempotencyKey: message.idempotencyKey, messageId: result.messageId } } });
  } catch (error) {
    await prisma.notification.update({ where: { id: notification.id }, data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery error" } });
    throw error;
  }
}
