import { redirect } from "next/navigation";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

export async function requireClientPortal(){
  const context=await requireUser();
  const portal=await prisma.clientPortal.findFirst({where:{primaryUserId:context.user.id,status:"ACTIVE"},include:{customerProfile:{include:{company:true}}}});
  if(!portal)redirect("/account");
  if(portal.invitationStatus!=="ACCEPTED"||!portal.activatedAt)await prisma.clientPortal.update({where:{id:portal.id},data:{invitationStatus:"ACCEPTED",activatedAt:new Date(),lastLoginAt:new Date()}});
  return{context,portal};
}
