"use server";

import Decimal from "decimal.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission,requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";
import { calculateComboPricing,validateComboPricing } from "./calculations";
import { assertComboTransition } from "./lifecycle";
import { runComboAutomation } from "./automation";

const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/[\s_-]+/g,"-").slice(0,90);
const date=z.coerce.date();
const optionalUrl=z.string().trim().url().optional().or(z.literal(""));

async function settings(){return prisma.comboCampaignSetting.upsert({where:{id:"default"},update:{},create:{id:"default"}})}

async function selectedItems(formData:FormData){
  const rows=[] as Array<{productId:string;quantity:number}>;
  for(let index=0;index<5;index++){
    const productId=String(formData.get(`product_${index}`)??"");
    if(!productId)continue;
    rows.push({productId:z.string().uuid().parse(productId),quantity:z.coerce.number().int().min(1).max(1000).parse(formData.get(`quantity_${index}`))});
  }
  if(rows.length<2)throw new Error("A combo requires at least two products.");
  if(new Set(rows.map(x=>x.productId)).size!==rows.length)throw new Error("A product can only appear once in a combo.");
  const products=await prisma.product.findMany({where:{id:{in:rows.map(x=>x.productId)}},include:{suppliers:{where:{isPreferred:true},take:1},inventory:true}});
  if(products.length!==rows.length||products.some(x=>x.status!=="PUBLISHED"||x.deletedAt))throw new Error("Every combo product must be active and published.");
  return rows.map(row=>{
    const product=products.find(x=>x.id===row.productId)!;
    const cost=new Decimal(product.costPrice?.toString()??product.suppliers[0]?.costPrice.toString()??0);
    if(cost.lte(0))throw new Error(`${product.name} has no verified cost price.`);
    const available=product.inventory.reduce((sum,x)=>sum+Math.max(0,x.onHand-x.reserved),0);
    if(available<row.quantity)throw new Error(`${product.name} only has ${available} available.`);
    return{product,quantity:row.quantity,cost,normalPrice:new Decimal(product.salePrice?.toString()??product.regularPrice.toString())};
  });
}

export async function saveComboCampaign(formData:FormData){
  const campaignId=String(formData.get("id")??"");
  const ctx=await requirePermission(campaignId?"combos.edit":"combos.create");
  const input=z.object({
    id:z.string().uuid().optional().or(z.literal("")),name:z.string().trim().min(3).max(160),headline:z.string().trim().min(3).max(180),
    description:z.string().trim().min(20).max(5000),benefits:z.string().trim().max(3000).optional(),type:z.enum(["DAILY","WEEKLY","MONTHLY","CUSTOM"]),
    startsAt:date,endsAt:date,targetAudience:z.string().trim().min(2).max(120),comboPrice:z.coerce.number().positive(),
    serviceCost:z.coerce.number().min(0).default(0),deliveryCost:z.coerce.number().min(0).default(0),paymentCost:z.coerce.number().min(0).default(0),
    imageUrl:optionalUrl,mobileImageUrl:optionalUrl,callToAction:z.enum(["Request a Quote","Get a Quick Quote","Speak to Sales","Order Now"]),
    emailSubject:z.string().trim().max(180).optional(),emailPreview:z.string().trim().max(240).optional(),emailBody:z.string().trim().max(10000).optional(),
    sliderHeadline:z.string().trim().max(180).optional(),sliderText:z.string().trim().max(500).optional(),socialCaption:z.string().trim().max(2000).optional(),
  }).parse(Object.fromEntries(formData));
  if(input.endsAt<=input.startsAt)throw new Error("Campaign end must be after its start.");
  const lines=await selectedItems(formData),config=await settings();
  if(lines.length>config.maximumProducts)throw new Error(`Only ${config.maximumProducts} products are allowed.`);
  const pricing=calculateComboPricing({items:lines.map(x=>({quantity:x.quantity,normalPrice:x.normalPrice,cost:x.cost})),comboPrice:input.comboPrice,serviceCost:input.serviceCost,deliveryCost:input.deliveryCost,paymentCost:input.paymentCost});
  const warnings=validateComboPricing(pricing,config);
  const campaign=await prisma.$transaction(async tx=>{
    const data={name:input.name,headline:input.headline,description:input.description,benefits:input.benefits||null,type:input.type,startsAt:input.startsAt,endsAt:input.endsAt,targetAudience:input.targetAudience,normalPrice:pricing.normalPrice,comboPrice:pricing.comboPrice,estimatedCost:pricing.productCost,serviceCost:input.serviceCost,deliveryCost:input.deliveryCost,paymentCost:input.paymentCost,grossProfit:pricing.grossProfit,profitMargin:pricing.profitMargin,imageUrl:input.imageUrl||null,mobileImageUrl:input.mobileImageUrl||null,callToAction:input.callToAction,emailSubject:input.emailSubject||null,emailPreview:input.emailPreview||null,emailBody:input.emailBody||null,sliderHeadline:input.sliderHeadline||null,sliderText:input.sliderText||null,socialCaption:input.socialCaption||null,requiresApproval:warnings.length>0,updatedById:ctx.user.id};
    if(input.id){
      const before=await tx.comboCampaign.findUniqueOrThrow({where:{id:input.id}});
      const updated=await tx.comboCampaign.update({where:{id:input.id},data:{...data,status:"DRAFT",approvedAt:null,approvedById:null,items:{deleteMany:{},create:lines.map(x=>({productId:x.product.id,quantity:x.quantity,productName:x.product.name,sku:x.product.sku,unitNormalPrice:x.normalPrice,unitCost:x.cost}))}}});
      await tx.auditLog.create({data:{actorId:ctx.user.id,action:"combo.update",entityType:"ComboCampaign",entityId:updated.id,before:{comboPrice:before.comboPrice,status:before.status},after:{comboPrice:updated.comboPrice,warnings}}});
      return updated;
    }
    const slug=`${slugify(input.name)}-${Date.now().toString(36)}`;
    const created=await tx.comboCampaign.create({data:{...data,slug,createdById:ctx.user.id,items:{create:lines.map(x=>({productId:x.product.id,quantity:x.quantity,productName:x.product.name,sku:x.product.sku,unitNormalPrice:x.normalPrice,unitCost:x.cost}))}}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:"combo.create",entityType:"ComboCampaign",entityId:created.id,after:{type:created.type,comboPrice:created.comboPrice,warnings}}});
    return created;
  });
  revalidatePath("/admin/marketing/combos");redirect(`/admin/marketing/combos/${campaign.id}`);
}

export async function setComboStatus(formData:FormData){
  const{id,status,reason}=z.object({id:z.string().uuid(),status:z.enum(["SCHEDULED","ACTIVE","PAUSED","CANCELLED"]),reason:z.string().trim().max(500).optional()}).parse(Object.fromEntries(formData));
  const ctx=await requirePermission(status==="PAUSED"?"combos.pause":"combos.publish");
  const campaign=await prisma.comboCampaign.findUniqueOrThrow({where:{id},include:{items:{include:{product:{include:{inventory:true}},supplierCatalogueProduct:true}}}});
  assertComboTransition(campaign.status,status);
  const config=await settings();
  const pricing=calculateComboPricing({items:campaign.items.map(x=>({quantity:x.quantity,normalPrice:x.unitNormalPrice,cost:x.unitCost})),comboPrice:campaign.comboPrice,serviceCost:campaign.serviceCost,deliveryCost:campaign.deliveryCost,paymentCost:campaign.paymentCost});
  const warnings=validateComboPricing(pricing,config);
  const unavailable=campaign.items.filter(x=>x.supplierCatalogueProduct?(!x.supplierCatalogueProduct.active||x.supplierCatalogueProduct.stock<x.quantity):(!x.product||x.product.status!=="PUBLISHED"||x.product.inventory.reduce((n,i)=>n+Math.max(0,i.onHand-i.reserved),0)<x.quantity));
  if(["SCHEDULED","ACTIVE"].includes(status)&&(warnings.length||unavailable.length))throw new Error([...warnings,...unavailable.map(x=>`${x.productName} is unavailable.`)].join(" "));
  await prisma.$transaction(async tx=>{
    await tx.comboCampaign.update({where:{id},data:{status,approvedAt:["SCHEDULED","ACTIVE"].includes(status)?new Date():campaign.approvedAt,approvedById:["SCHEDULED","ACTIVE"].includes(status)?ctx.user.id:campaign.approvedById}});
    await tx.auditLog.create({data:{actorId:ctx.user.id,action:`combo.${status.toLowerCase()}`,entityType:"ComboCampaign",entityId:id,before:{status:campaign.status},after:{status,reason}}});
  });
  revalidatePath("/combos");revalidatePath(`/combos/${campaign.slug}`);revalidatePath(`/admin/marketing/combos/${id}`);
}

export async function publishComboChannels(formData:FormData){
  const ctx=await requirePermission("combos.slider.manage");const id=z.string().uuid().parse(formData.get("id"));
  const campaign=await prisma.comboCampaign.findUniqueOrThrow({where:{id},include:{items:true}});
  const link=`/combos/${campaign.slug}`;
  const block=await prisma.marketingBlock.upsert({where:{key:`combo-${id}`},update:{location:"HOMEPAGE_TOP",type:"HERO",title:campaign.name,content:{heading:campaign.sliderHeadline??campaign.headline,body:campaign.sliderText??`${campaign.name} — save R ${Number(campaign.normalPrice)-Number(campaign.comboPrice)}`,buttonLabel:campaign.callToAction,buttonLink:link,desktopImage:campaign.imageUrl,mobileImage:campaign.mobileImageUrl,altText:campaign.headline},status:campaign.status==="ACTIVE"?"PUBLISHED":"SCHEDULED",startsAt:campaign.startsAt,endsAt:campaign.endsAt,updatedById:ctx.user.id},create:{key:`combo-${id}`,location:"HOMEPAGE_TOP",type:"HERO",title:campaign.name,content:{heading:campaign.sliderHeadline??campaign.headline,body:campaign.sliderText??campaign.description,buttonLabel:campaign.callToAction,buttonLink:link,desktopImage:campaign.imageUrl,mobileImage:campaign.mobileImageUrl,altText:campaign.headline},status:campaign.status==="ACTIVE"?"PUBLISHED":"SCHEDULED",startsAt:campaign.startsAt,endsAt:campaign.endsAt,createdById:ctx.user.id,updatedById:ctx.user.id}});
  const html=`<h1>${campaign.headline}</h1><p>${campaign.description}</p><ul>${campaign.items.map(x=>`<li>${x.productName} × ${x.quantity}</li>`).join("")}</ul><p><s>R ${Number(campaign.normalPrice).toFixed(2)}</s> <strong>R ${Number(campaign.comboPrice).toFixed(2)}</strong></p><p><a href="${link}">${campaign.callToAction}</a></p>`;
  const email=await prisma.emailCampaign.create({data:{name:`Combo: ${campaign.name}`,subject:campaign.emailSubject??campaign.headline,preview:campaign.emailPreview??campaign.description.slice(0,180),html}});
  await prisma.comboCampaign.update({where:{id},data:{sliderVisible:true,marketingBlockId:block.id,emailCampaignId:email.id}});
  await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"combo.channels.publish",entityType:"ComboCampaign",entityId:id,after:{marketingBlockId:block.id,emailCampaignId:email.id}}});
  revalidatePath("/");revalidatePath(`/admin/marketing/combos/${id}`);
}

export async function saveComboSettings(formData:FormData){
  const ctx=await requirePermission("combos.automation.manage");
  const data=z.object({minimumProfitAmount:z.coerce.number().min(0),minimumProfitMargin:z.coerce.number().min(0).max(100),maximumDiscountPercent:z.coerce.number().min(0).max(100),maximumProducts:z.coerce.number().int().min(2).max(10),maximumActiveCampaigns:z.coerce.number().int().min(1).max(50),targetProfitMargin:z.coerce.number().min(0).max(100)}).parse(Object.fromEntries(formData));
  await prisma.comboCampaignSetting.upsert({where:{id:"default"},update:{...data,dailyEnabled:formData.get("dailyEnabled")==="on",weeklyEnabled:formData.get("weeklyEnabled")==="on",monthlyEnabled:formData.get("monthlyEnabled")==="on",automaticPublication:formData.get("automaticPublication")==="on",automaticEmail:formData.get("automaticEmail")==="on",automaticSlider:formData.get("automaticSlider")==="on"},create:{id:"default",...data}});
  await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"combo.settings.update",entityType:"ComboCampaignSetting",entityId:"default",after:data}});
  revalidatePath("/admin/marketing/combos");
}

export async function runComboAutomationNow(){
  const ctx=await requirePermission("combos.automation.manage");
  const result=await runComboAutomation();
  await prisma.auditLog.create({data:{actorId:ctx.user.id,action:"combo.automation.force-run",entityType:"ComboCampaignSetting",entityId:"default",after:result}});
  revalidatePath("/");revalidatePath("/combos");revalidatePath("/admin/marketing/combos");
  redirect(`/admin/marketing/combos?notice=automation-ran&created=${result.created.length}&changed=${result.statusesChanged}`);
}

export async function requestComboQuotation(formData:FormData){
  const ctx=await requireUser();const id=z.string().uuid().parse(formData.get("id"));
  const campaign=await prisma.comboCampaign.findFirstOrThrow({where:{id,status:"ACTIVE",startsAt:{lte:new Date()},endsAt:{gt:new Date()}},include:{items:{include:{product:{include:{inventory:true}},supplierCatalogueProduct:true}}}});
  for(const item of campaign.items){const available=item.supplierCatalogueProduct?item.supplierCatalogueProduct.active&&item.supplierCatalogueProduct.stock>=item.quantity:Boolean(item.product&&item.product.inventory.reduce((n,i)=>n+Math.max(0,i.onHand-i.reserved),0)>=item.quantity);if(!available)throw new Error(`${item.productName} is no longer available.`)}
  const requestNumber=`QR-${Date.now().toString(36).toUpperCase()}`;
  const request=await prisma.quotationRequest.create({data:{requestNumber,userId:ctx.user.id,contactName:ctx.user.name??ctx.user.email,email:ctx.user.email,requirements:`Combo campaign: ${campaign.name}`,items:{create:campaign.items.map(x=>({productId:x.productId,productName:x.productName,requestedQuantity:x.quantity,supplierId:x.supplierCatalogueProduct?.supplierId,supplierProductId:x.supplierCatalogueProduct?.supplierProductId,supplierSku:x.supplierCatalogueProduct?.supplierSku,productSnapshot:x.supplierCatalogueProduct?{name:x.productName,sku:x.sku,comboUnitPrice:x.unitNormalPrice.toString()}:undefined}))},comboSnapshot:{create:{campaignId:campaign.id,campaignName:campaign.name,normalPrice:campaign.normalPrice,comboPrice:campaign.comboPrice,discountAmount:new Decimal(campaign.normalPrice.toString()).minus(campaign.comboPrice.toString()),estimatedCost:campaign.estimatedCost,expectedGrossProfit:campaign.grossProfit,items:campaign.items.map(x=>({productId:x.productId,supplierCatalogueProductId:x.supplierCatalogueProductId,name:x.productName,sku:x.sku,quantity:x.quantity,unitNormalPrice:x.unitNormalPrice.toString(),unitCost:x.unitCost.toString()}))}}}});
  await prisma.comboCampaignEvent.create({data:{campaignId:id,type:"QUOTATION_REQUEST",channel:"WEBSITE",data:{quotationRequestId:request.id,userId:ctx.user.id}}});
  redirect(`/account/quotations?submitted=${requestNumber}`);
}

export async function generateComboDraft(formData:FormData){
  const ctx=await requirePermission("combos.ai.generate");
  const input=z.object({type:z.enum(["DAILY","WEEKLY","MONTHLY"]),audience:z.string().trim().min(2).max(120)}).parse(Object.fromEntries(formData));
  const products=await prisma.product.findMany({where:{status:"PUBLISHED",deletedAt:null,OR:[{isTestData:false},{isTestData:true,sku:{startsWith:"COMBO-TEST-"}}]},include:{inventory:true,suppliers:{where:{isPreferred:true},take:1}},take:80});
  const candidates=products.map(p=>({id:p.id,name:p.name,categoryId:p.categoryId,price:Number(p.salePrice??p.regularPrice),cost:Number(p.costPrice??p.suppliers[0]?.costPrice??0),available:p.inventory.reduce((n,x)=>n+Math.max(0,x.onHand-x.reserved),0)})).filter(x=>x.cost>0&&x.available>0);
  if(candidates.length<2)redirect("/admin/marketing/combos?notice=catalogue-not-ready");
  const response=await getOpenAIClient().responses.create({model:process.env.OPENAI_MODEL??"gpt-5.6",store:false,input:`Create one ${input.type.toLowerCase()} combo draft for ${input.audience}. Use only product IDs supplied. Choose 2-5 complementary products, quantity 1 unless stock supports more. Do not invent facts or prices. Return JSON with name, headline, description, productIds, quantities, targetDiscountPercent (0-20), emailSubject, emailPreview, sliderHeadline, sliderText and socialCaption. Products: ${JSON.stringify(candidates)}`,text:{format:{type:"json_schema",name:"combo_draft",strict:true,schema:{type:"object",additionalProperties:false,properties:{name:{type:"string"},headline:{type:"string"},description:{type:"string"},productIds:{type:"array",items:{type:"string"},minItems:2,maxItems:5},quantities:{type:"array",items:{type:"integer"},minItems:2,maxItems:5},targetDiscountPercent:{type:"number"},emailSubject:{type:"string"},emailPreview:{type:"string"},sliderHeadline:{type:"string"},sliderText:{type:"string"},socialCaption:{type:"string"}},required:["name","headline","description","productIds","quantities","targetDiscountPercent","emailSubject","emailPreview","sliderHeadline","sliderText","socialCaption"]}}}}, {timeout:45_000});
  const draft=z.object({name:z.string().min(3).max(160),headline:z.string().min(3).max(180),description:z.string().min(20).max(5000),productIds:z.array(z.string().uuid()).min(2).max(5),quantities:z.array(z.number().int().positive()).min(2).max(5),targetDiscountPercent:z.number().min(0).max(20),emailSubject:z.string().max(180),emailPreview:z.string().max(240),sliderHeadline:z.string().max(180),sliderText:z.string().max(500),socialCaption:z.string().max(2000)}).parse(JSON.parse(response.output_text));
  if(draft.productIds.length!==draft.quantities.length||new Set(draft.productIds).size!==draft.productIds.length)throw new Error("AI returned an invalid product selection.");
  const selected=draft.productIds.map((id,index)=>{const p=products.find(x=>x.id===id);if(!p)throw new Error("AI selected a product outside the approved catalogue set.");const cost=new Decimal(p.costPrice?.toString()??p.suppliers[0]?.costPrice.toString()??0);const price=new Decimal(p.salePrice?.toString()??p.regularPrice.toString());const quantity=Math.min(draft.quantities[index],p.inventory.reduce((n,x)=>n+Math.max(0,x.onHand-x.reserved),0));return{p,cost,price,quantity};});
  const config=await settings(),normal=selected.reduce((n,x)=>n.plus(x.price.mul(x.quantity)),new Decimal(0));
  const discounted=normal.mul(new Decimal(1).minus(new Decimal(draft.targetDiscountPercent).div(100)));
  const cost=selected.reduce((n,x)=>n.plus(x.cost.mul(x.quantity)),new Decimal(0));
  const protectedMinimum=Decimal.max(cost.plus(config.minimumProfitAmount),cost.div(new Decimal(1).minus(new Decimal(config.minimumProfitMargin.toString()).div(100))));
  const comboPrice=Decimal.max(discounted,protectedMinimum).toDecimalPlaces(2);
  const pricing=calculateComboPricing({items:selected.map(x=>({quantity:x.quantity,normalPrice:x.price,cost:x.cost})),comboPrice});
  const startsAt=new Date(),endsAt=new Date(startsAt.getTime()+(input.type==="DAILY"?1:input.type==="WEEKLY"?7:30)*86400000);
  const campaign=await prisma.$transaction(async tx=>{const created=await tx.comboCampaign.create({data:{slug:`${slugify(draft.name)}-${Date.now().toString(36)}`,name:draft.name,headline:draft.headline,description:draft.description,type:input.type,status:"DRAFT",startsAt,endsAt,targetAudience:input.audience,normalPrice:pricing.normalPrice,comboPrice:pricing.comboPrice,estimatedCost:pricing.productCost,grossProfit:pricing.grossProfit,profitMargin:pricing.profitMargin,emailSubject:draft.emailSubject,emailPreview:draft.emailPreview,sliderHeadline:draft.sliderHeadline,sliderText:draft.sliderText,socialCaption:draft.socialCaption,aiGenerated:true,createdById:ctx.user.id,updatedById:ctx.user.id,items:{create:selected.map(x=>({productId:x.p.id,quantity:x.quantity,productName:x.p.name,sku:x.p.sku,unitNormalPrice:x.price,unitCost:x.cost}))}}});await tx.auditLog.create({data:{actorId:ctx.user.id,action:"combo.ai.generate",entityType:"ComboCampaign",entityId:created.id,after:{productIds:draft.productIds,comboPrice:comboPrice.toString()}}});return created});
  redirect(`/admin/marketing/combos/${campaign.id}`);
}
