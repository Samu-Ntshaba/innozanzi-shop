export type EmailAttachment = { filename: string; content: Buffer; contentType: string };
export type EmailMessage = { to: string; subject: string; html: string; text: string; idempotencyKey: string; attachments?: EmailAttachment[] };
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
    const sandboxInboxId = process.env.MAILTRAP_SANDBOX_INBOX_ID;
    const sandboxEnabled = process.env.MAILTRAP_SANDBOX === "true";
    if (sandboxEnabled && !sandboxInboxId) throw new Error("MAILTRAP_SANDBOX_INBOX_ID must be configured when sandbox mode is enabled");
    if (sandboxEnabled && process.env.NODE_ENV === "production") throw new Error("Mailtrap Sandbox cannot be used for production customer email delivery");
    const endpoint = sandboxEnabled
      ? `https://sandbox.api.mailtrap.io/api/send/${sandboxInboxId}`
      : "https://send.api.mailtrap.io/api/send";
    const response = await fetch(endpoint, {
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
        attachments: message.attachments?.map(attachment => ({ filename: attachment.filename, content: attachment.content.toString("base64"), type: attachment.contentType, disposition: "attachment" })),
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

export class MailtrapSmtpEmailProvider implements EmailProvider {
  private readonly transporter;
  constructor(
    password = process.env.MAILTRAP_SMTP_PASSWORD,
    private readonly senderEmail = process.env.MAIL_FROM_EMAIL ?? "support@innozanzi.co.za",
    private readonly senderName = process.env.MAIL_FROM_NAME ?? "Innozanzi Shop",
  ) {
    if (!password) throw new Error("MAILTRAP_SMTP_PASSWORD must be configured");
    this.transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_SMTP_HOST ?? "live.smtp.mailtrap.io",
      port: Number(process.env.MAILTRAP_SMTP_PORT ?? 587),
      secure: false,
      requireTLS: true,
      connectionTimeout: Number(process.env.MAILTRAP_CONNECTION_TIMEOUT_MS ?? 8_000),
      greetingTimeout: Number(process.env.MAILTRAP_GREETING_TIMEOUT_MS ?? 8_000),
      socketTimeout: Number(process.env.MAILTRAP_SOCKET_TIMEOUT_MS ?? 12_000),
      auth: { user: process.env.MAILTRAP_SMTP_USERNAME ?? "api", pass: password },
    });
  }
  async send(message: EmailMessage) {
    const result = await this.transporter.sendMail({ from: { name: this.senderName, address: this.senderEmail }, to: message.to, subject: message.subject, text: message.text, html: message.html, attachments: message.attachments, headers: { "X-Idempotency-Key": message.idempotencyKey } });
    return { messageId: result.messageId };
  }
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) { if (process.env.NODE_ENV !== "test") console.info("Email queued", { to: message.to, subject: message.subject, idempotencyKey: message.idempotencyKey }); return { messageId: `console:${message.idempotencyKey}` }; }
}

export function getEmailProvider(): EmailProvider {
  if (process.env.MAILTRAP_SANDBOX === "true") return new MailtrapEmailProvider();
  if (process.env.MAILTRAP_SMTP_PASSWORD) return new MailtrapSmtpEmailProvider();
  return process.env.MAILTRAP_API_TOKEN ? new MailtrapEmailProvider() : new ConsoleEmailProvider();
}
import nodemailer from "nodemailer";
