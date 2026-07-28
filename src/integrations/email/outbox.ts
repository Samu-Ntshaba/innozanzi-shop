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
    const failureData = { to: message.to, cc: message.cc, text: message.text, idempotencyKey: message.idempotencyKey, deliveryMode, from: message.from, category: message.category };
    const failure = error instanceof Error ? error.message.slice(0, 2_000) : "Email provider rejected the message.";
    if (existing) {
      await prisma.notification.update({ where: { id: existing.id }, data: { userId: userId ?? existing.userId, subject: message.subject, body: message.html, data: failureData, status: "FAILED", sentAt: null, error: failure } });
    } else {
      await prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data: failureData, status: "FAILED", error: failure } });
    }
    throw error;
  }
  const data = { to: message.to, cc: message.cc, text: message.text, idempotencyKey: message.idempotencyKey, messageId: result.messageId, deliveryMode, from: message.from, category: message.category };

  if (existing) {
    return prisma.notification.update({ where: { id: existing.id }, data: { userId: userId ?? existing.userId, subject: message.subject, body: message.html, data, status: "SENT", sentAt: new Date(), error: null } });
  }
  return prisma.notification.create({ data: { userId, type: "EMAIL_OUTBOX", channel: "email", subject: message.subject, body: message.html, data, status: "SENT", sentAt: new Date() } });
}

export async function retryFailedEmails(limit = 50) {
  const rows = await prisma.notification.findMany({
    where: { type: "EMAIL_OUTBOX", status: "FAILED" },
    orderBy: { updatedAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const data = row.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data as Record<string, unknown> : {};
    const attempts = typeof data.retryAttempts === "number" ? data.retryAttempts : 0;
    if (attempts >= 5 || typeof data.to !== "string" || typeof data.text !== "string" || typeof data.idempotencyKey !== "string") continue;
    const message: EmailMessage = {
      to: data.to,
      cc: Array.isArray(data.cc) ? data.cc.filter((value): value is string => typeof value === "string") : undefined,
      subject: row.subject ?? "Innozanzi notification",
      html: row.body,
      text: data.text,
      idempotencyKey: data.idempotencyKey,
      category: data.category === "marketing" ? "marketing" : "transactional",
      from: data.from && typeof data.from === "object" && !Array.isArray(data.from)
        && typeof (data.from as Record<string, unknown>).email === "string"
        && typeof (data.from as Record<string, unknown>).name === "string"
        ? data.from as { email: string; name: string }
        : undefined,
    };
    try {
      const result = await getEmailProvider().send(message);
      await prisma.notification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date(), error: null, data: { ...data, retryAttempts: attempts + 1, lastRetryAt: new Date().toISOString(), messageId: result.messageId, deliveryMode: mailDeliveryMode() } } });
      sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 2_000) : "Email retry failed.";
      await prisma.notification.update({ where: { id: row.id }, data: { error: reason, data: { ...data, retryAttempts: attempts + 1, lastRetryAt: new Date().toISOString() } } });
      failed += 1;
    }
  }
  return { checked: rows.length, sent, failed };
}
