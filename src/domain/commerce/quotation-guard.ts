import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { sellableSupplierWhere } from "@/integrations/suppliers/availability";
import { minimumRetailPrice, supplierRetailPrice } from "@/domain/catalogue/retail-pricing";
import { getCommerceSettings } from "./settings";
export async function validateQuotationPrices(items:Array<{id:string;sourceType:string;sourceId:string|null;productId:string|null;variantId:string|null;quantity:number;unitPrice:Decimal;costPrice:Decimal|null}>) {
 const settings=await getCommerceSettings();const results=new Map<string,{cost:Decimal;snapshot:Record<string,unknown>}>();
 for(const item of items){
  let cost:Decimal;let floor:Decimal;let offerTimestamp:string|null=null;
  if(item.sourceType==="SUPPLIER"){
   const offer=await prisma.supplierCatalogueProduct.findFirst({where:{id:item.sourceId??"",active:true,...await sellableSupplierWhere()}});
   if(!offer?.costPrice||offer.stock<item.quantity)throw new Error("A quotation item needs refreshed supplier pricing or stock. Please ask for an updated quotation.");
   const price=await supplierRetailPrice({costPrice:offer.costPrice,promotionalPrice:offer.promotionalPrice,promotionStartsAt:offer.promotionStartsAt,promotionEndsAt:offer.promotionEndsAt});
   cost=price.promotionActive?new Decimal(offer.promotionalPrice!):new Decimal(offer.costPrice);floor=price.minimumPrice;offerTimestamp=offer.lastSeenAt.toISOString();
  }else{
   const product=item.productId?await prisma.product.findUnique({where:{id:item.productId},select:{costPrice:true}}):null;
   const variant=item.variantId?await prisma.productVariant.findUnique({where:{id:item.variantId},select:{costPrice:true}}):null;
   if(!(variant?.costPrice??product?.costPrice))throw new Error("A quotation item needs a cost-price review before payment.");
   cost=new Decimal((variant?.costPrice??product!.costPrice)!);floor=await minimumRetailPrice(cost);
  }
  if(new Decimal(item.unitPrice).lt(floor))throw new Error("This quotation is below its current protected price. Please ask our team for a refreshed quotation before payment.");
  results.set(item.id,{cost,snapshot:{costPrice:cost.toString(),protectedFloor:floor.toString(),pricingSettings:settings,sourceTimestamp:offerTimestamp,reviewedAt:new Date().toISOString()}});
 }
 return results;
}
