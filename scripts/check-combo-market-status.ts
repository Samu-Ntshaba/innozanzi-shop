import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main(){
  const rows=await prisma.comboCampaign.findMany({where:{aiGenerated:true,status:"ACTIVE"},select:{name:true,comboPrice:true,profitMargin:true,marketCheckedAt:true,marketResearch:true}});
  console.log(rows.map(row=>({name:row.name,price:row.comboPrice.toString(),margin:row.profitMargin.toString(),checked:row.marketCheckedAt,evidenceProducts:Array.isArray((row.marketResearch as {products?:unknown[]}|null)?.products)?(row.marketResearch as {products:unknown[]}).products.length:0})));
}
main().finally(()=>prisma.$disconnect());
