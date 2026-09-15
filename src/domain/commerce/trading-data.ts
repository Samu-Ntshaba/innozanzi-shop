import Decimal from "decimal.js";
import {prisma} from "@/lib/prisma";
import {getCommerceSettings} from "./settings";
import {contributionAtPrice,innozanziPrice} from "./engine";
import {summarizeTrading} from "./trading";

export async function getTradingData(days:number){
  const end=new Date(),start=new Date(end.getTime()-days*86400000),previous=new Date(start.getTime()-days*86400000);
  const settings=await getCommerceSettings();
  const orderWhere={isTestData:false,paymentStatus:"PAID" as const,placedAt:{gte:previous,lt:end}};
  const [offers,locals,orders,orderCount,refundCount]=await Promise.all([
    prisma.supplierCatalogueProduct.findMany({where:{active:true},select:{id:true,name:true,supplierSku:true,category:true,costPrice:true,recommendedRetail:true,promotionalPrice:true,promotionStartsAt:true,promotionEndsAt:true,stock:true,currency:true,lastSeenAt:true,supplier:{select:{companyName:true}},feed:{select:{lastSuccessAt:true,enabled:true}}}}),
    prisma.product.findMany({where:{status:"PUBLISHED",deletedAt:null,isTestData:false},select:{id:true,name:true,sku:true,costPrice:true,regularPrice:true,salePrice:true,saleStartsAt:true,saleEndsAt:true,category:{select:{name:true}}}}),
    prisma.order.findMany({where:orderWhere,orderBy:{placedAt:"desc"},take:5000,select:{id:true,orderNumber:true,placedAt:true,createdAt:true,paymentStatus:true,isTestData:true,items:{select:{id:true,productId:true,sourceId:true,sourceType:true,productName:true,sku:true,quantity:true,unitPrice:true,lineTotal:true,vatTotal:true,costPrice:true,sourceSnapshot:true}}}}),
    prisma.order.count({where:orderWhere}),
    prisma.order.count({where:{isTestData:false,paymentStatus:{in:["PARTIALLY_REFUNDED","REFUNDED"]},placedAt:{gte:previous,lt:end}}}),
  ]);
  const sales=orders.flatMap(order=>order.items.map(item=>({sourceKey:`${item.sourceType}:${item.sourceId??item.productId??item.sku}`,quantity:item.quantity,gross:item.lineTotal.toString(),vat:item.vatTotal.toString(),unitPrice:item.unitPrice.toString(),snapshot:item.sourceSnapshot,orderedAt:order.placedAt??order.createdAt,paymentStatus:order.paymentStatus,isTestData:order.isTestData})));
  const summaries=summarizeTrading(sales,{start,previous,end});
  const lastSale=new Map<string,{price:Decimal;cost:Decimal|null;date:Date;name:string;sku:string}>();
  for(const order of orders)for(const item of order.items){const key=`${item.sourceType}:${item.sourceId??item.productId??item.sku}`;if(!lastSale.has(key))lastSale.set(key,{price:new Decimal(item.unitPrice),cost:item.costPrice?new Decimal(item.costPrice):null,date:order.placedAt??order.createdAt,name:item.productName,sku:item.sku});}
  type Candidate={key:string;name:string;sku:string;category:string;supplier:string;cost:Decimal|null;rrp:Decimal|null;price:Decimal|null;stock:number|null;stale:boolean;currency:string};
  const candidates:Candidate[]=offers.map(offer=>{
    const promotion=offer.promotionalPrice?.gt(0)&&offer.costPrice&&offer.promotionalPrice.lt(offer.costPrice)&&(!offer.promotionStartsAt||offer.promotionStartsAt<=end)&&(!offer.promotionEndsAt||offer.promotionEndsAt>=end);
    return {key:`SUPPLIER:${offer.id}`,name:offer.name,sku:offer.supplierSku,category:offer.category??"Uncategorised",supplier:offer.supplier.companyName,cost:promotion?new Decimal(offer.promotionalPrice!):offer.costPrice?new Decimal(offer.costPrice):null,rrp:offer.recommendedRetail?new Decimal(offer.recommendedRetail):null,price:null,stock:offer.stock,currency:offer.currency,stale:!offer.feed.enabled||!offer.feed.lastSuccessAt||end.getTime()-offer.feed.lastSuccessAt.getTime()>settings.freshnessHours*3600000||end.getTime()-offer.lastSeenAt.getTime()>settings.freshnessHours*3600000};
  });
  for(const product of locals){const promotion=product.salePrice&&(!product.saleStartsAt||product.saleStartsAt<=end)&&(!product.saleEndsAt||product.saleEndsAt>=end);candidates.push({key:`LOCAL:${product.id}`,name:product.name,sku:product.sku,category:product.category.name,supplier:"Innozanzi stock",cost:product.costPrice?new Decimal(product.costPrice):null,rrp:null,price:new Decimal(promotion?product.salePrice!:product.regularPrice),stock:null,stale:false,currency:"ZAR"});}
  const keys=new Set(candidates.map(c=>c.key));
  for(const [key,sale] of lastSale)if(!keys.has(key))candidates.push({key,name:sale.name,sku:sale.sku,category:"Historical sale",supplier:"Historical source",cost:null,rrp:null,price:null,stock:null,stale:false,currency:"ZAR"});
  const rows=candidates.map(candidate=>{
    let price:string|null=null,floor:string|null=null,margin:string|null=null,headroom:string|null=null,reason:string|null=null;
    try{
      if(candidate.currency!=="ZAR"||!candidate.cost?.gt(0))throw new Error("Missing or invalid cost/currency");
      const economics=innozanziPrice(candidate.cost,settings),selling=candidate.price??economics.gross;
      price=selling.toFixed(2);floor=economics.floor.gross.toFixed(2);headroom=selling.minus(economics.floor.gross).div(economics.floor.gross).mul(100).toFixed(2);
      margin=new Decimal(contributionAtPrice(candidate.cost,selling,settings,economics.floor.gateway).margin).toFixed(2);
      if(selling.lt(economics.floor.gross))reason="Below safe floor";
      else if(candidate.stale)reason="Stale supplier data";
    }catch{reason="Pricing review required";}
    const last=lastSale.get(candidate.key),summary=summaries.get(candidate.key);
    return {...candidate,cost:candidate.cost?.toFixed(2)??null,rrp:candidate.rrp?.toFixed(2)??null,price,floor,margin,headroom,reason,summary,
      priceMovement:price&&last?new Decimal(price).minus(last.price).toFixed(2):null,
      costMovement:candidate.cost&&last?.cost?candidate.cost.minus(last.cost).toFixed(2):null,
      comparisonDate:last?.date??null,
    };
  });
  const currentOrders=orders.filter(order=>(order.placedAt??order.createdAt)>=start);
  const reconciliations=await prisma.auditLog.findMany({where:{action:"order.economics.reconcile",entityType:"Order",entityId:{in:currentOrders.map(o=>o.id)}},orderBy:{createdAt:"desc"},select:{id:true,entityId:true,createdAt:true,after:true}});
  const reconciled=new Set<string>();
  const actual=reconciliations.flatMap(record=>{
    if(!record.entityId||reconciled.has(record.entityId))return [];reconciled.add(record.entityId);
    const values=record.after&&typeof record.after==="object"&&!Array.isArray(record.after)?record.after:null;
    if(typeof values?.profit!=="string"||typeof values?.margin!=="string")return [];
    const order=currentOrders.find(o=>o.id===record.entityId)!;
    return [{id:order.id,number:order.orderNumber,profit:values.profit,margin:values.margin,reconciledAt:record.createdAt}];
  });
  return {rows,actual,days,start,previous,end,orderCount,loadedOrders:orders.length,refundCount};
}
