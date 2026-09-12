export type EmailRecipient = { id: string; email: string };

export function uniqueEmailRecipients(...groups: EmailRecipient[][]) {
  const recipients = new Map<string, EmailRecipient>();
  for (const recipient of groups.flat()) {
    const key = recipient.email.trim().toLowerCase();
    if (key && !recipients.has(key)) recipients.set(key, { ...recipient, email: recipient.email.trim() });
  }
  return [...recipients.values()];
}
