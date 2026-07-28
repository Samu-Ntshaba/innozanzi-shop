import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";

export async function notifySupportOfNewUser(input: {
  userId: string;
  name: string | null;
  email: string;
  accountType: string;
  source: string;
  createdBy?: string | null;
}) {
  try {
    await enqueueEmail(emailTemplates.newUserCreated(
      input.userId,
      input.name ?? "New user",
      input.email,
      input.accountType,
      input.source,
      input.createdBy,
    ));
  } catch (error) {
    console.error(`New-user support notification failed for ${input.userId}`, error);
  }
}
