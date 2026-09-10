"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMobileAdmin } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const input=z.object({userId:z.string().uuid(),enabled:z.enum(["true","false"])});

export async function setProductTesterAccess(formData:FormData){
  const context=await requireMobileAdmin();
  const data=input.parse(Object.fromEntries(formData));
  const [user,role]=await Promise.all([
    prisma.user.findFirst({where:{id:data.userId,deletedAt:null},select:{id:true,email:true}}),
    prisma.role.findUnique({where:{slug:"product-tester"},select:{id:true,name:true}}),
  ]);
  if(!user||!role)throw new Error("Product testing access is unavailable.");
  const enabled=data.enabled==="true";
  await prisma.$transaction(async tx=>{
    if(enabled)await tx.userRole.upsert({where:{userId_roleId:{userId:user.id,roleId:role.id}},update:{assignedBy:context.user.id},create:{userId:user.id,roleId:role.id,assignedBy:context.user.id}});
    else await tx.userRole.deleteMany({where:{userId:user.id,roleId:role.id}});
    await tx.auditLog.create({data:{actorId:context.user.id,action:enabled?"product-tester.assign":"product-tester.remove",entityType:"User",entityId:user.id,after:{enabled,email:user.email,roleId:role.id}}});
  });
  revalidatePath("/mobile-admin/testers");
  revalidatePath("/admin/access-control");
}
