import { getCommerceSettings } from "@/domain/commerce/settings";
import type { Prisma } from "@/generated/prisma/client";
export async function sellableSupplierWhere():Promise<Prisma.SupplierCatalogueProductWhereInput>{const settings=await getCommerceSettings();const since=new Date(Date.now()-settings.freshnessHours*3600000);return {active:true,displayPreferred:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},lastSeenAt:{gte:since},supplier:{purchasingEnabled:true,approvalStatus:"APPROVED"},feed:{enabled:true,lastSuccessAt:{gte:since}}};}
