import { timingSafeEqual } from "node:crypto";
import { enqueueEmail } from "@/integrations/email/outbox";
import { prisma } from "@/lib/prisma";

function allowed(request:Request){const expected=process.env.CRON_SECRET,supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";if(!expected)return false;const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(request:Request){
  if(!allowed(request))return Response.json({error:"Unauthorized"},{status:401});
  const cutoff=new Date(Date.now()-30*86400000),projects=await prisma.pcProject.findMany({where:{status:{in:["PLANNING","READY_TO_BUILD","IN_PROGRESS"]},OR:[{lastReminderAt:null},{lastReminderAt:{lte:cutoff}}]},include:{user:true,items:true},take:500});
  for(const project of projects){const total=project.items.reduce((sum,item)=>sum+Number(item.configuredPrice),0),purchased=project.items.filter(item=>item.purchasedAt).reduce((sum,item)=>sum+Number(item.purchasedPrice??item.configuredPrice),0),progress=total?Math.round(purchased/total*100):0,url=`${(process.env.NEXT_PUBLIC_SITE_URL??"https://shop.innozanzi.co.za").replace(/\/$/,"")}/account/pc-projects/${project.id}`;await enqueueEmail({to:project.user.email,subject:`${project.name} is ${progress}% complete 🎮`,text:`You have secured ${project.items.filter(item=>item.purchasedAt).length} of ${project.items.length} configured components. Your build is waiting for its next upgrade: ${url}`,html:`<h1>${project.name} is ${progress}% complete 🎮</h1><p>You have secured ${project.items.filter(item=>item.purchasedAt).length} of ${project.items.length} configured components.</p><p>Your build is waiting for its next upgrade.</p><p><a href="${url}">Continue your PC project</a></p>`,idempotencyKey:`pc-project-reminder:${project.id}:${new Date().toISOString().slice(0,7)}`});await prisma.pcProject.update({where:{id:project.id},data:{lastReminderAt:new Date()}})}
  return Response.json({reminded:projects.length});
}
