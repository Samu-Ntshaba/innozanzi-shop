import type { Metadata } from "next";
import { PcBuilderWorkspace } from "@/components/store/pc-builder-workspace";
import { getPcBuilderSteps } from "@/domain/catalogue/pc-builder";
import { getAuthContext } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { BehaviourSignal } from "@/components/store/behaviour-signal";
import { PcBuilderWelcome } from "@/components/store/pc-builder-welcome";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Build Your Own PC Online",description:"Build a compatible custom PC step by step using live components, stock and customer pricing from Innozanzi distributors.",alternates:{canonical:"/build-a-pc"}};

export default async function BuildPcPage({searchParams}:{searchParams:Promise<{error?:string;project?:string;draftName?:string;draftType?:string;review?:string}>}){
  const[steps,query,ctx]=await Promise.all([getPcBuilderSteps(),searchParams,getAuthContext()]);
  const project=query.project&&ctx?await prisma.pcProject.findFirst({where:{id:query.project,userId:ctx.user.id},include:{items:true}}):null;
  return <><BehaviourSignal signal={{eventType:"BUILD_VISIT",entityType:"EXPERIENCE",entityId:"build-a-pc",category:"PC Components",context:"pc-builder"}}/><PcBuilderWelcome/><PcBuilderWorkspace steps={steps} error={query.error} authenticated={Boolean(ctx)} draftName={query.draftName?.slice(0,80)} draftType={query.draftType==="COMPLETE_SETUP"?"COMPLETE_SETUP":query.draftType==="PC_ONLY"?"PC_ONLY":undefined} startInReview={query.review==="1"} project={project?{id:project.id,name:project.name,buildType:project.buildType,analysis:project.aiAnalysis,items:project.items.map(item=>({stepKey:item.stepKey,productId:item.supplierProductId,purchased:Boolean(item.purchasedAt),name:item.productName,sku:item.sku,image:item.image,price:item.configuredPrice.toString(),specifications:item.specifications}))}:undefined}/></>;
}
