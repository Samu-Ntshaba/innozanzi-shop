import {prisma} from "@/lib/prisma";

const variant=(value:unknown)=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
export async function syncMarketProducts(limit=5000){
  const rows=await prisma.supplierCatalogueProduct.findMany({where:{active:true,displayPreferred:true,costPrice:{not:null},OR:[{barcode:{not:null}},{manufacturerSku:{not:null}}]},orderBy:{id:"asc"},take:limit,select:{id:true,name:true,brand:true,manufacturerSku:true,barcode:true,category:true,specifications:true}});
  await prisma.$transaction(rows.map(row=>prisma.marketProduct.upsert({where:{key:`SUPPLIER:${row.id}`},update:{name:row.name,brand:row.brand,mpn:row.manufacturerSku,gtin:row.barcode,category:row.category,variant:variant(row.specifications)},create:{key:`SUPPLIER:${row.id}`,sourceType:"SUPPLIER",sourceId:row.id,name:row.name,brand:row.brand,mpn:row.manufacturerSku,gtin:row.barcode,category:row.category,variant:variant(row.specifications)}})));
  return rows.length;
}
