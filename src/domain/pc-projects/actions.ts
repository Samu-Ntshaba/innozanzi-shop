"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { getOrCreateCart } from "@/domain/cart/service";
import { isDailySpecial, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { getOpenAIClient } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { enqueueEmail } from "@/integrations/email/outbox";
import { emailTemplates } from "@/integrations/email/templates";
import { progressivePurchaseEligibility } from "./policy";
import { pcPartCompatibility } from "./compatibility";
import { productMatchesPcBuildStep, type PcBuildStepKey } from "@/domain/catalogue/pc-builder";

const requiredKeys=["cpu","motherboard","memory","storage","power","case"];
const projectSchema=z.object({name:z.string().trim().min(3).max(80),buildType:z.enum(["PC_ONLY","COMPLETE_SETUP"]),intendedUse:z.enum(["GAMING","WORK","CREATION","BALANCED"]),performanceTarget:z.enum(["EASY","SMOOTH","HIGH_PERFORMANCE"]),gamePreferences:z.array(z.string().trim().min(1).max(60)).max(8)});
const projectInput=(formData:FormData)=>projectSchema.parse({...Object.fromEntries(formData),gamePreferences:formData.getAll("gamePreferences")});

export async function continuePcProjectAuthentication(formData:FormData){
  const data=projectSchema.extend({mode:z.enum(["login","register"])}).parse({...Object.fromEntries(formData),gamePreferences:formData.getAll("gamePreferences")});
  const params=new URLSearchParams({draftName:data.name,draftType:data.buildType,draftUse:data.intendedUse,draftTarget:data.performanceTarget});data.gamePreferences.forEach(game=>params.append("draftGame",game));
  const returnTo=`/build-a-pc?${params}`;
  (await cookies()).set("innozanzi-return-to",returnTo,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60});
  redirect(data.mode==="login"?"/sign-in?from=pc-project":"/register?from=pc-project");
}

export async function createPcProject(formData:FormData){
  const ctx=await requireUser(),data=projectInput(formData);
  const project=await prisma.pcProject.create({data:{userId:ctx.user.id,...data}});
  await enqueueEmail(emailTemplates.pcProjectCreated(ctx.user.email,project.id,project.name),ctx.user.id).catch(error=>console.error("PC project confirmation email could not be queued",error));
  redirect(`/build-a-pc?project=${project.id}`);
}

export async function savePcProjectPart(input:{projectId:string;stepKey:string;productId:string}){
  const ctx=await requireUser(),data=z.object({projectId:z.string().uuid(),stepKey:z.enum(["cpu","motherboard","memory","storage","graphics","power","case","cooling","monitor","keyboard","mouse","audio"]),productId:z.string().uuid()}).parse(input);
  const project=await prisma.pcProject.findFirst({where:{id:data.projectId,userId:ctx.user.id},include:{items:true}});
  if(!project)throw new Error("PC project not found.");
  const existing=project.items.find(item=>item.stepKey===data.stepKey);
  if(existing?.purchasedAt)throw new Error("Purchased components cannot be replaced.");
  if(project.buildType==="PC_ONLY"&&["monitor","keyboard","mouse","audio"].includes(data.stepKey))throw new Error("Desk peripherals are not part of this PC-only project.");
  const product=await prisma.supplierCatalogueProduct.findFirst({where:{id:data.productId,active:true,availability:"IN_STOCK",stock:{gt:0}},select:{id:true,name:true,supplierSku:true,categoryPath:true,images:true,specifications:true,costPrice:true,recommendedRetail:true,promotionalPrice:true,promotionStartsAt:true,promotionEndsAt:true}});
  if(!product?.costPrice)throw new Error("This component is no longer available.");
  if(!productMatchesPcBuildStep(data.stepKey as PcBuildStepKey,product.categoryPath))throw new Error("That product does not belong in this PC component stage.");
  const selected=Object.fromEntries(project.items.map(item=>[item.stepKey,{name:item.productName,specifications:item.specifications}]));
  const compatibility=pcPartCompatibility(data.stepKey,{name:product.name,categoryPath:product.categoryPath,specifications:product.specifications},selected);if(compatibility.kind==="bad")throw new Error(compatibility.label);
  const retail=supplierRetailPrice({costPrice:product.costPrice,recommendedRetail:product.recommendedRetail,promotionalPrice:product.promotionalPrice,promotionStartsAt:product.promotionStartsAt,promotionEndsAt:product.promotionEndsAt,special:isDailySpecial(product.id)}),price=retail.salePrice??retail.regularPrice;
  await prisma.pcProjectItem.upsert({where:{projectId_stepKey:{projectId:project.id,stepKey:data.stepKey}},create:{projectId:project.id,stepKey:data.stepKey,supplierProductId:product.id,productName:product.name,sku:product.supplierSku,image:product.images[0],specifications:product.specifications??undefined,configuredPrice:price},update:{supplierProductId:product.id,productName:product.name,sku:product.supplierSku,image:product.images[0],specifications:product.specifications??undefined,configuredPrice:price}});
  const keys=new Set([...project.items.filter(item=>item.stepKey!==data.stepKey).map(item=>item.stepKey),data.stepKey]);
  const configured=requiredKeys.every(key=>keys.has(key));
  await prisma.pcProject.update({where:{id:project.id},data:{status:configured?project.items.some(item=>item.purchasedAt)?"IN_PROGRESS":"READY_TO_BUILD":"PLANNING",aiAnalysis:Prisma.DbNull,analysisFingerprint:null}});
  revalidatePath(`/build-a-pc`);revalidatePath(`/account/pc-projects/${project.id}`);return{saved:true};
}

export async function addPcProjectPartsToCart(formData:FormData){
  const ctx=await requireUser(),projectId=z.string().uuid().parse(formData.get("projectId"));
  const submitted=formData.getAll("itemId");
  const ids=z.array(z.string().uuid()).min(1).parse(submitted.length?submitted:JSON.parse(z.string().parse(formData.get("itemIds"))));
  const project=await prisma.pcProject.findFirst({where:{id:projectId,userId:ctx.user.id},include:{items:true}});if(!project)throw new Error("PC project not found.");
  const items=project.items.filter(item=>ids.includes(item.id)&&!item.purchasedAt);if(items.length!==new Set(ids).size)throw new Error("One or more selected parts cannot be purchased.");
  const live=await prisma.supplierCatalogueProduct.findMany({where:{id:{in:items.map(item=>item.supplierProductId)},active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0}}});
  if(live.length!==items.length)redirect(`/account/pc-projects/${project.id}?error=availability`);
  const total=live.reduce((sum,item)=>sum+Number(supplierRetailPrice({costPrice:item.costPrice!,recommendedRetail:item.recommendedRetail,promotionalPrice:item.promotionalPrice,promotionStartsAt:item.promotionStartsAt,promotionEndsAt:item.promotionEndsAt,special:isDailySpecial(item.id)}).salePrice??supplierRetailPrice({costPrice:item.costPrice!}).regularPrice),0);if(!progressivePurchaseEligibility(total).eligible)redirect(`/account/pc-projects/${project.id}?error=minimum`);
  const cart=await getOrCreateCart();
  await prisma.$transaction(async tx=>{await tx.cartItem.deleteMany({where:{cartId:cart.id}});await tx.supplierCartItem.deleteMany({where:{cartId:cart.id}});await tx.cart.update({where:{id:cart.id},data:{pcProjectId:project.id}});await tx.supplierCartItem.createMany({data:live.map(product=>({cartId:cart.id,supplierId:product.supplierId,supplierProductId:product.supplierProductId,supplierSku:product.supplierSku,quantity:1}))})});
  revalidatePath("/cart");redirect("/cart?status=project-parts-added");
}

export async function analysePcProject(formData:FormData){
  const ctx=await requireUser(),projectId=z.string().uuid().parse(formData.get("projectId"));const project=await prisma.pcProject.findFirst({where:{id:projectId,userId:ctx.user.id},include:{items:true}});if(!project)throw new Error("PC project not found.");
  if(!requiredKeys.every(key=>project.items.some(item=>item.stepKey===key)))throw new Error("Complete the required configuration first.");
  const hardware=project.items.map(item=>({type:item.stepKey,name:item.productName,specifications:item.specifications}));const intent={use:project.intendedUse,performanceTarget:project.performanceTarget,games:project.gamePreferences};const fingerprint=createHash("sha256").update(JSON.stringify({hardware,intent})).digest("hex");
  let analysis:{personality:string;gaming:{label:string;rating:string}[];games:{tier:string;titles:string[]}[]};
  try{const response=await getOpenAIClient().responses.create({model:process.env.OPENAI_MODEL??"gpt-5.6-luna",store:false,max_output_tokens:900,input:`Analyse this proposed PC using only supplied evidence. Treat game performance as an estimate, never a guarantee, and say when evidence is insufficient. Consider the customer's stated intent. Return strict JSON with personality (max 45 words), gaming array with labels 1080p Gaming, 1440p Gaming, 4K Gaming, Competitive Gaming, Streaming + Gaming and ratings Poor/Entry/Moderate/Very Good/Excellent, and games array with tiers Excellent, Very Good, Playable and recognisable game titles. Customer intent: ${JSON.stringify(intent)}. Hardware: ${JSON.stringify(hardware)}`});analysis=JSON.parse(response.output_text.replace(/^```json\s*|\s*```$/g,""))}catch{analysis={personality:"A balanced custom machine designed around the components you selected. Final gaming performance depends mainly on the chosen graphics card, processor and available memory.",gaming:["1080p Gaming","1440p Gaming","4K Gaming","Competitive Gaming","Streaming + Gaming"].map(label=>({label,rating:"Requires specification review"})),games:[]}}
  await prisma.pcProject.update({where:{id:project.id},data:{aiAnalysis:analysis,analysisFingerprint:fingerprint}});revalidatePath(`/build-a-pc`);revalidatePath(`/account/pc-projects/${project.id}`);redirect(`/build-a-pc?project=${project.id}&review=1`);
}
