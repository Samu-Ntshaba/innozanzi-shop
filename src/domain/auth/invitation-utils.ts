import { randomBytes } from "node:crypto";
import type{Prisma}from"@/generated/prisma/client";

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(18);
  const generated = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `Az9!${generated}`;
}

export function invitationExpiry(hours = Number(process.env.USER_INVITATION_EXPIRY_HOURS ?? "48")) {
  return new Date(Date.now() + Math.max(1, Math.min(hours, 168)) * 60 * 60 * 1_000);
}

export function invitationRenewalMode(partnerships:readonly {status:string}[]){
  if(partnerships.some(partnership=>["APPROVED","CONDITIONALLY_APPROVED"].includes(partnership.status)))return "LINK_ONLY" as const;
  return partnerships.length?"PARTNER_INACTIVE" as const:"TEMPORARY_PASSWORD" as const;
}

export async function retireStalePartnerInvitationEmails(database:{notification:{updateMany:(args:Prisma.NotificationUpdateManyArgs)=>Promise<unknown>}},userId:string){
  await database.notification.updateMany({
    where:{userId,type:"EMAIL_OUTBOX",subject:"Your Innozanzi sales partner account is ready",status:{in:["PENDING","FAILED"]}},
    data:{status:"READ",error:"Superseded by a newer partner invitation."},
  });
}
