export type EmailMessage = { to: string; subject: string; html: string; text: string; idempotencyKey: string };
export interface EmailProvider { send(message: EmailMessage): Promise<{ messageId: string }> }

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) { if (process.env.NODE_ENV !== "test") console.info("Email queued", { to: message.to, subject: message.subject, idempotencyKey: message.idempotencyKey }); return { messageId: `console:${message.idempotencyKey}` }; }
}
