import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { QuotationSourceLine } from "@/domain/catalogue/product-source";
import type { Prisma } from "@/generated/prisma/client";
export async function orderDiscount(lines:QuotationSourceLine[],userId:string,code:string,db:Prisma.TransactionClient|typeof prisma=prisma){
 const now=new Date(),total=lines.reduce((s,l)=>s.plus(l.grossUnit.mul(l.quantity)),new Decimal(0));
 const where={isActive:true,scope:"ORDER" as const,AND:[{OR:[{startsAt:null},{startsAt:{lte:now}}]},{OR:[{expiresAt:null},{expiresAt:{gt:now}}]}]};
 const coupons=await db.coupon.findMany({where:{...where,...(code?{code:code.trim().toUpperCase(),automatic:false}:{automatic:true})},orderBy:{createdAt:"desc"},take:20});
 let best:{id:string;code:string;discount:Decimal}|null=null;
 const floor=lines.reduce((s,l)=>s.plus(new Decimal(String(l.sourceSnapshot.protectedFloor??l.grossUnit)).mul(l.quantity)),new Decimal(0));
 for(const coupon of coupons){
  if(coupon.minimumOrderValue&&total.lt(coupon.minimumOrderValue))continue;
  const used=await db.couponRedemption.count({where:{couponId:coupon.id}}),userUsed=await db.couponRedemption.count({where:{couponId:coupon.id,userId}});
  if(coupon.usageLimit!==null&&used>=coupon.usageLimit||coupon.usageLimitPerUser!==null&&userUsed>=coupon.usageLimitPerUser)continue;
  let discount=coupon.type==="PERCENTAGE"?total.mul(coupon.value).div(100):new Decimal(coupon.value);
  if(coupon.maximumDiscount)discount=Decimal.min(discount,coupon.maximumDiscount);
  discount=discount.toDecimalPlaces(2,Decimal.ROUND_DOWN);
  if(discount.lte(0)||total.minus(discount).lt(floor))continue;
  if(!best||discount.gt(best.discount))best={id:coupon.id,code:coupon.code,discount};
 }
 if(code&&!best)throw new Error("This coupon is unavailable for this basket. Check its dates, minimum spend and eligible products.");
 return best;
}
