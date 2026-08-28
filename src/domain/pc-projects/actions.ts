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

const requiredKeys=["cpu","motherboard","memory","storage","power","case"];
const projectSchema=z.object({name:z.string().trim().min(3).max(80),buildType:z.enum(["PC_ONLY","COMPLETE_SETUP"])});

export async function continuePcProjectAuthentication(formData:FormData){
  const data=projectSchema.extend({mode:z.enum(["login","register"])}).parse(Object.fromEntries(formData));
  const returnTo=`/build-a-pc?draftName=${encodeURIComponent(data.name)}&draftType=${data.buildType}`;
  (await cookies()).set("innozanzi-return-to",returnTo,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60});
  redirect(data.mode==="login"?"/sign-in?from=pc-project":"/register?from=pc-project");
}

export async function createPcProject(formData:FormData){
  const ctx=await requireUser(),data=projectSchema.parse(Object.fromEntries(formData));
  const project=await prisma.pcProject.create({data:{userId:ctx.user.id,name:data.name,buildType:data.buildType}});
  redirect(`/build-a-pc?project=${project.id}`);
}

export async function savePcProjectPart(input:{projectId:string;stepKey:string;productId:string}){
  const ctx=await requireUser();
  const project=await prisma.pcProject.findFirst({where:{id:input.projectId,userId:ctx.user.id},include:{items:true}});
  if(!project)throw new Error("PC project not found.");
  const existing=project.items.find(item=>item.stepKey===input.stepKey);
  if(existing?.purchasedAt)throw new Error("Purchased components cannot be replaced.");
  const product=await prisma.supplierCatalogueProduct.findFirst({where:{id:input.productId,active:true,stock:{gt:0}},select:{id:true,name:true,supplierSku:true,images:true,specifications:true,costPrice:true,recommendedRetail:true,promotionalPrice:true,promotionStartsAt:true,promotionEndsAt:true}});
  if(!product?.costPrice)throw new Error("This component is no longer available.");
  const retail=supplierRetailPrice({costPrice:product.costPrice,recommendedRetail:product.recommendedRetail,promotionalPrice:product.promotionalPrice,promotionStartsAt:product.promotionStartsAt,promotionEndsAt:product.promotionEndsAt,special:isDailySpecial(product.id)}),price=retail.salePrice??retail.regularPrice;
  await prisma.pcProjectItem.upsert({where:{projectId_stepKey:{projectId:project.id,stepKey:input.stepKey}},create:{projectId:project.id,stepKey:input.stepKey,supplierProductId:product.id,productName:product.name,sku:product.supplierSku,image:product.images[0],specifications:product.specifications??undefined,configuredPrice:price},update:{supplierProductId:product.id,productName:product.name,sku:product.supplierSku,image:product.images[0],specifications:product.specifications??undefined,configuredPrice:price}});
  const keys=new Set([...project.items.filter(item=>item.stepKey!==input.stepKey).map(item=>item.stepKey),input.stepKey]);
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
  const total=live.reduce((sum,item)=>sum+Number(supplierRetailPrice({costPrice:item.costPrice!,recommendedRetail:item.recommendedRetail,promotionalPrice:item.promotionalPrice,promotionStartsAt:item.promotionStartsAt,promotionEndsAt:item.promotionEndsAt,special:isDailySpecial(item.id)}).salePrice??supplierRetailPrice({costPrice:item.costPrice!}).regularPrice),0);if(total<2000)redirect(`/account/pc-projects/${project.id}?error=minimum`);
  const cart=await getOrCreateCart();
  await prisma.$transaction(async tx=>{await tx.cartItem.deleteMany({where:{cartId:cart.id}});await tx.supplierCartItem.deleteMany({where:{cartId:cart.id}});await tx.cart.update({where:{id:cart.id},data:{pcProjectId:project.id}});await tx.supplierCartItem.createMany({data:live.map(product=>({cartId:cart.id,supplierId:product.supplierId,supplierProductId:product.supplierProductId,supplierSku:product.supplierSku,quantity:1}))})});
  revalidatePath("/cart");redirect("/cart?status=project-parts-added");
}

export async function analysePcProject(formData:FormData){
  const ctx=await requireUser(),projectId=z.string().uuid().parse(formData.get("projectId"));const project=await prisma.pcProject.findFirst({where:{id:projectId,userId:ctx.user.id},include:{items:true}});if(!project)throw new Error("PC project not found.");
  if(!requiredKeys.every(key=>project.items.some(item=>item.stepKey===key)))throw new Error("Complete the required configuration first.");
  const hardware=project.items.map(item=>({type:item.stepKey,name:item.productName,specifications:item.specifications}));const fingerprint=createHash("sha256").update(JSON.stringify(hardware)).digest("hex");
  let analysis:{personality:string;gaming:{label:string;rating:string}[];games:{tier:string;titles:string[]}[]};
  try{const response=await getOpenAIClient().responses.create({model:process.env.OPENAI_MODEL??"gpt-5.6-luna",store:false,max_output_tokens:900,input:`Analyse this proposed PC using only supplied evidence. Be conservative where specifications are missing. Return strict JSON with personality (max 45 words), gaming array with labels 1080p Gaming, 1440p Gaming, 4K Gaming, Competitive Gaming, Streaming + Gaming and ratings Poor/Entry/Moderate/Very Good/Excellent, and games array with tiers Excellent, Very Good, Playable and recognisable game titles. Hardware: ${JSON.stringify(hardware)}`});analysis=JSON.parse(response.output_text.replace(/^```json\s*|\s*```$/g,""))}catch{analysis={personality:"A balanced custom machine designed around the components you selected. Final gaming performance depends mainly on the chosen graphics card, processor and available memory.",gaming:["1080p Gaming","1440p Gaming","4K Gaming","Competitive Gaming","Streaming + Gaming"].map(label=>({label,rating:"Requires specification review"})),games:[]}}
  await prisma.pcProject.update({where:{id:project.id},data:{aiAnalysis:analysis,analysisFingerprint:fingerprint}});revalidatePath(`/build-a-pc`);revalidatePath(`/account/pc-projects/${project.id}`);redirect(`/build-a-pc?project=${project.id}&review=1`);
}
