export type EmailMessage = { to: string; subject: string; html: string; text: string; idempotencyKey: string };
export interface EmailProvider { send(message: EmailMessage): Promise<{ messageId: string }> }

type MailtrapResponse = { success?: boolean; message_ids?: string[]; errors?: Array<{ message?: string }> };

export class MailtrapEmailProvider implements EmailProvider {
  constructor(
    private readonly token = process.env.MAILTRAP_API_TOKEN,
    private readonly senderEmail = process.env.MAIL_FROM_EMAIL ?? "support@innozanzi.co.za",
    private readonly senderName = process.env.MAIL_FROM_NAME ?? "Innozanzi Shop",
  ) {}

  async send(message: EmailMessage) {
    if (!this.token) throw new Error("MAILTRAP_API_TOKEN must be configured");
    const response = await fetch("https://send.api.mailtrap.io/api/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { email: this.senderEmail, name: this.senderName },
        to: [{ email: message.to }],
        subject: message.subject,
        text: message.text,
        html: message.html,
        category: "transactional",
        custom_variables: { idempotency_key: message.idempotencyKey },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => ({})) as MailtrapResponse;
    if (!response.ok || result.success === false) {
      throw new Error(`Mailtrap delivery failed (${response.status}): ${result.errors?.[0]?.message ?? "unknown error"}`);
    }
    return { messageId: result.message_ids?.[0] ?? `mailtrap:${message.idempotencyKey}` };
  }
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) { if (process.env.NODE_ENV !== "test") console.info("Email queued", { to: message.to, subject: message.subject, idempotencyKey: message.idempotencyKey }); return { messageId: `console:${message.idempotencyKey}` }; }
}

export function getEmailProvider(): EmailProvider {
  return process.env.MAILTRAP_API_TOKEN ? new MailtrapEmailProvider() : new ConsoleEmailProvider();
}
