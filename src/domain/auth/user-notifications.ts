import { emailTemplates } from "@/integrations/email/templates";
import { sendStaffEmail } from "@/domain/notifications/role-email";
import { prisma } from "@/lib/prisma";

export async function notifySupportOfNewUser(input: {
  userId: string;
  name: string | null;
  email: string;
  accountType: string;
  source: string;
  createdBy?: string | null;
}) {
  try {
    const message=emailTemplates.newUserCreated(
      input.userId,
      input.name ?? "New user",
      input.email,
      input.accountType,
      input.source,
      input.createdBy,
    );
    const mobileAdmins=await prisma.user.findMany({where:{status:"ACTIVE",deletedAt:null,roles:{some:{role:{slug:{in:["mobile-admin","super-administrator"]}}}}},select:{id:true}});
    await Promise.all([
      sendStaffEmail("USER_CREATED",message),
      mobileAdmins.length?prisma.notification.createMany({data:mobileAdmins.map(({id})=>({userId:id,type:"USER_CREATED",channel:"IN_APP",subject:message.subject,body:`${input.name??"New user"} (${input.email}) created a ${input.accountType.replaceAll("_"," ").toLowerCase()} account.`,status:"SENT" as const,sentAt:new Date(),data:{userId:input.userId,email:input.email,source:input.source,category:"NEW_ACCOUNT"}}))}):Promise.resolve(),
    ]);
  } catch (error) {
    console.error(`New-user support notification failed for ${input.userId}`, error);
  }
}
