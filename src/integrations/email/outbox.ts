import { prisma } from "@/lib/prisma";
import type { EmailMessage } from "./provider";

export async function enqueueEmail(message: EmailMessage, userId?: string) {
  return prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data: { to: message.to, text: message.text, idempotencyKey: message.idempotencyKey }, status: "PENDING" } });
}
