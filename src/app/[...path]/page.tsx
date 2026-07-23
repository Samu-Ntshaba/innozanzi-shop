import { notFound,redirect,permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export default async function LegacyPublicPath({params}:{params:Promise<{path:string[]}>}){const sourcePath=`/${(await params).path.join("/")}`;const rule=await prisma.redirectRule.findFirst({where:{sourcePath,isActive:true}});if(!rule)notFound();await prisma.redirectRule.update({where:{id:rule.id},data:{hitCount:{increment:1},lastHitAt:new Date()}});if(rule.type==="PERMANENT")permanentRedirect(rule.targetPath);redirect(rule.targetPath)}
