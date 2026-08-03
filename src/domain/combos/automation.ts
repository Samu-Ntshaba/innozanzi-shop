import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { calculateComboPricing } from "./calculations";
import { scheduledComboState } from "./lifecycle";

const DAY=86_400_000;
const slugify=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);

const templates={
  DAILY:{days:1,audience:"Growing businesses",name:"Business productivity pair",headline:"Upgrade the way your team works",categories:["Computers","Computer peripherals"]},
  WEEKLY:{days:7,audience:"Connected offices",name:"Connected office bundle",headline:"Reliable technology for the working week",categories:["Networking & security","Power"]},
  MONTHLY:{days:30,audience:"Business teams",name:"Complete business technology bundle",headline:"Equip your business for bigger work",categories:["Computers","Computer peripherals","Power"]},
} as const;

type AutomationType=keyof typeof templates;

async function createAutomatedCombo(type:AutomationType,now:Date,targetMargin:Decimal,automaticPublication:boolean,automaticSlider:boolean){
  const template=templates[type];
  const existing=await prisma.comboCampaign.findFirst({where:{type,status:{in:["DRAFT","SCHEDULED","ACTIVE"]},endsAt:{gt:now},aiGenerated:true,isTestData:false}});
  if(existing)return null;
  const pools=await Promise.all(template.categories.map(category=>prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},category},orderBy:[{costPrice:"desc"},{sourceUpdatedAt:"desc"}],take:24,select:{id:true,name:true,supplierSku:true,costPrice:true,recommendedRetail:true,images:true,stock:true}})));
  const seed=Math.floor(now.getTime()/(template.days*DAY));
  const selected=pools.map((pool,index)=>pool[(seed+index*7)%pool.length]).filter((x):x is NonNullable<typeof x>=>Boolean(x));
  if(selected.length<2)return null;
  const items=selected.map(product=>({quantity:1,cost:new Decimal(product.costPrice!.toString()),normalPrice:new Decimal(product.recommendedRetail?.toString()??product.costPrice!.toString())}));
  const productCost=items.reduce((sum,item)=>sum.plus(item.cost),new Decimal(0));
  const safeMargin=Decimal.min(new Decimal(60),Decimal.max(new Decimal(5),targetMargin));
  const comboPrice=productCost.div(new Decimal(1).minus(safeMargin.div(100))).toDecimalPlaces(2,Decimal.ROUND_UP);
  const advertisedNormal=items.reduce((sum,item)=>sum.plus(item.normalPrice),new Decimal(0));
  const normalPrice=Decimal.max(advertisedNormal,comboPrice);
  const pricing=calculateComboPricing({items:items.map(item=>({...item,normalPrice:normalPrice.div(items.length)})),comboPrice});
  const startsAt=now,endsAt=new Date(now.getTime()+template.days*DAY);
  const stamp=now.toISOString().slice(0,10);
  return prisma.comboCampaign.create({data:{
    slug:`${slugify(template.name)}-${type.toLowerCase()}-${stamp}`,
    name:`${template.name} · ${stamp}`,headline:template.headline,
    description:`A carefully selected ${selected.map(x=>x.name).join(" plus ")} package for ${template.audience.toLowerCase()}. Live availability is rechecked before quotation.`,
    type,status:automaticPublication?"ACTIVE":"DRAFT",startsAt,endsAt,targetAudience:template.audience,
    normalPrice,comboPrice,estimatedCost:pricing.productCost,grossProfit:pricing.grossProfit,profitMargin:pricing.profitMargin,
    imageUrl:selected[0].images[0]??null,callToAction:"Request a Quote",sliderHeadline:template.headline,
    sliderText:`Business-ready technology with a protected ${safeMargin.toDecimalPlaces(1)}% target margin.`,sliderVisible:automaticPublication&&automaticSlider,featured:type==="WEEKLY",aiGenerated:true,
    items:{create:selected.map((product,index)=>({supplierCatalogueProductId:product.id,quantity:1,productName:product.name,sku:product.supplierSku,unitNormalPrice:items[index].normalPrice,unitCost:items[index].cost}))},
  }});
}

export async function runComboAutomation(now=new Date()){
  const config=await prisma.comboCampaignSetting.upsert({where:{id:"default"},update:{},create:{id:"default",dailyEnabled:true,weeklyEnabled:true,monthlyEnabled:true,automaticPublication:true,automaticSlider:true,minimumProfitMargin:5,targetProfitMargin:10}});
  const campaigns=await prisma.comboCampaign.findMany({where:{status:{in:["SCHEDULED","ACTIVE","PAUSED","SOLD_OUT"]}},include:{items:{include:{product:{include:{inventory:true}},supplierCatalogueProduct:true}}}});
  let changed=0;
  for(const campaign of campaigns){
    if(campaign.aiGenerated&&campaign.items.every(item=>item.supplierCatalogueProduct?.costPrice)){
      const costs=campaign.items.map(item=>new Decimal(item.supplierCatalogueProduct!.costPrice!.toString()).mul(item.quantity));
      const totalCost=costs.reduce((sum,cost)=>sum.plus(cost),new Decimal(0));
      const target=Decimal.min(60,Decimal.max(5,new Decimal(config.targetProfitMargin.toString())));
      const comboPrice=totalCost.div(new Decimal(1).minus(target.div(100))).toDecimalPlaces(2,Decimal.ROUND_UP);
      const rrp=campaign.items.reduce((sum,item)=>sum.plus(new Decimal(item.supplierCatalogueProduct!.recommendedRetail?.toString()??comboPrice.toString()).mul(item.quantity)),new Decimal(0));
      await prisma.$transaction([prisma.comboCampaign.update({where:{id:campaign.id},data:{estimatedCost:totalCost,comboPrice,normalPrice:Decimal.max(rrp,comboPrice),grossProfit:comboPrice.minus(totalCost),profitMargin:target}}),...campaign.items.map((item,index)=>prisma.comboCampaignItem.update({where:{id:item.id},data:{unitCost:costs[index].div(item.quantity),unitNormalPrice:new Decimal(item.supplierCatalogueProduct!.recommendedRetail?.toString()??comboPrice.toString())}}))]);
    }
    const stock=campaign.items.every(item=>item.supplierCatalogueProduct?item.supplierCatalogueProduct.active&&item.supplierCatalogueProduct.stock>=item.quantity:Boolean(item.product&&item.product.status==="PUBLISHED"&&item.product.inventory.reduce((n,x)=>n+Math.max(0,x.onHand-x.reserved),0)>=item.quantity));
    const next=scheduledComboState(campaign.status,campaign.startsAt,campaign.endsAt,stock,now);
    if(next===campaign.status)continue;
    await prisma.$transaction([prisma.comboCampaign.update({where:{id:campaign.id},data:{status:next,sliderVisible:next==="ACTIVE"&&config.automaticSlider}}),prisma.comboCampaignEvent.create({data:{campaignId:campaign.id,type:`STATUS_${next}`,channel:"AUTOMATION"}})]);changed++;
  }
  const enabled:AutomationType[]=[];
  if(config.dailyEnabled)enabled.push("DAILY");if(config.weeklyEnabled)enabled.push("WEEKLY");if(config.monthlyEnabled)enabled.push("MONTHLY");
  const active=await prisma.comboCampaign.count({where:{status:{in:["ACTIVE","SCHEDULED"]},endsAt:{gt:now},isTestData:false}});
  const capacity=Math.max(0,config.maximumActiveCampaigns-active);const created=[];
  for(const type of enabled.slice(0,capacity)){const campaign=await createAutomatedCombo(type,now,new Decimal(config.targetProfitMargin.toString()),config.automaticPublication,config.automaticSlider);if(campaign){created.push({id:campaign.id,type:campaign.type,name:campaign.name,status:campaign.status,comboPrice:campaign.comboPrice.toString(),profitMargin:campaign.profitMargin.toString()});await prisma.comboCampaignEvent.create({data:{campaignId:campaign.id,type:"AUTOMATICALLY_CREATED",channel:"AUTOMATION"}})}}
  return{checked:campaigns.length,statusesChanged:changed,created,activeBeforeRun:active,sliderRotationWindow:Math.floor(now.getTime()/(3*DAY))};
}
