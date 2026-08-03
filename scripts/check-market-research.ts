import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { researchMarketPrices } from "../src/domain/combos/automation";

async function main(){
  const products=await prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",costPrice:{gt:0},manufacturerSku:{not:null},category:{in:["Computers","Computer peripherals"]}},orderBy:{costPrice:"desc"},take:2,select:{name:true,supplierSku:true,manufacturerSku:true}});
  const result=await researchMarketPrices(products);
  console.log(JSON.stringify(result,null,2));
}
main().finally(()=>prisma.$disconnect());
