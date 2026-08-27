import { prisma } from "@/lib/prisma";
import { enqueueEmail } from "@/integrations/email/outbox";
import type { EmailMessage } from "@/integrations/email/provider";
import { supportEmail } from "@/lib/support";

export const STAFF_EMAIL_EVENTS = [
  ["USER_CREATED", "New user created", "A new account is created or invited."],
  ["USER_ACTIVATED", "User activated", "An invited staff or customer account becomes active."],
  ["QUOTATION_REQUESTED", "Quotation requested", "A customer submits a new quotation or payment review request."],
  ["HELP_DESK_CREATED", "Help-desk ticket created", "A new support request is submitted."],
  ["HELP_DESK_CUSTOMER_REPLY", "Customer replied to ticket", "A customer adds a reply to an existing support ticket."],
  ["PAYMENT_REVIEW_REQUIRED", "Payment review required", "Proof of payment or an online payment needs attention."],
  ["ORDER_PAID", "Paid order requires acceptance", "A verified customer payment created an order that must be accepted within 30 minutes."],
  ["PARTNERSHIP_APPLICATION", "Partnership application", "A new partnership application needs review."],
  ["RETURN_REQUESTED", "Return or complaint submitted", "A customer submits a return or product complaint."],
] as const;

export type StaffEmailEvent = (typeof STAFF_EMAIL_EVENTS)[number][0];

export async function staffEmailRecipients(eventKey: StaffEmailEvent) {
  const users = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      accountType: "INTERNAL_EMPLOYEE",
      roles: { some: { role: { emailPreferences: { some: { eventKey, enabled: true } } } } },
    },
    select: { id: true, email: true },
  });
  const unique = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  return [...unique.values()];
}

export async function sendStaffEmail(eventKey: StaffEmailEvent, message: EmailMessage) {
  const recipients = await staffEmailRecipients(eventKey);
  if (!recipients.length) {
    recipients.push({ id: "", email: supportEmail });
  }
  return Promise.all(recipients.map((recipient) => enqueueEmail({
    ...message,
    to: recipient.email,
    idempotencyKey: `${message.idempotencyKey}:${recipient.email.toLowerCase()}`,
  }, recipient.id || undefined)));
}
