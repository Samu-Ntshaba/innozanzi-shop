import { prisma } from "@/lib/prisma";
import { getCommerceSettings } from "@/domain/commerce/settings";
// All supplier offers remain intact. Only the preferred public card changes.
export async function reconcileOfferDisplay(){const settings=await getCommerceSettings();const since=new Date(Date.now()-settings.freshnessHours*3600000);await prisma.$executeRaw`
WITH ranked AS (
 SELECT p.id, ROW_NUMBER() OVER (PARTITION BY COALESCE(p."identityKey",p.id::text)
 ORDER BY (p.active AND p.stock>0 AND s."purchasingEnabled" AND f.enabled AND p."lastSeenAt">=${since} AND f."lastSuccessAt">=${since}) DESC,
 p."costPrice" ASC NULLS LAST,p.id) AS rank
 FROM "SupplierCatalogueProduct" p JOIN "Supplier" s ON s.id=p."supplierId" JOIN "SupplierFeed" f ON f.id=p."feedId"
) UPDATE "SupplierCatalogueProduct" p SET "displayPreferred"=(ranked.rank=1) FROM ranked WHERE p.id=ranked.id`;
}
