import { getCommerceSettings } from "@/domain/commerce/settings";
export async function sellableSupplierWhere(){const settings=await getCommerceSettings();const since=new Date(Date.now()-settings.freshnessHours*3600000);return {displayPreferred:true,lastSeenAt:{gte:since},supplier:{purchasingEnabled:true,approvalStatus:"APPROVED"},feed:{enabled:true,lastSuccessAt:{gte:since}}};}
