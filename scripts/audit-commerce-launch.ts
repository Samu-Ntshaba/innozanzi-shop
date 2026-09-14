import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { commerceSchema } from "../src/domain/commerce/config";
import { innozanziPrice } from "../src/domain/commerce/engine";
import { gatewayConfigured } from "../src/integrations/payments/approved-gateways";

// Read-only. Output is aggregated; never print credentials, feed URLs or customer data.
async function main(){
 const settingsRow=await prisma.siteSetting.findUnique({where:{key:"commerce.pricing.v1"}});
 const settings=commerceSchema.parse(settingsRow?.value??{});
 const [feeds,products,locals,pendingPayments,pendingCommunication,paidWithoutInvoice,failedEmail]=await Promise.all([
  prisma.supplierFeed.findMany({select:{provider:true,enabled:true,lastSuccessAt:true,supplier:{select:{purchasingEnabled:true,approvalStatus:true}}}}),
  prisma.supplierCatalogueProduct.findMany({where:{active:true},select:{costPrice:true,recommendedRetail:true,stock:true,lastSeenAt:true}}),
  prisma.product.findMany({where:{deletedAt:null,status:"PUBLISHED",isTestData:false},select:{costPrice:true,regularPrice:true}}),
  prisma.payment.count({where:{provider:{in:["OZOW","PAYFAST"]},status:"PENDING",createdAt:{lt:new Date(Date.now()-30*60000)}}}),
  prisma.notification.count({where:{type:"PAID_ORDER_COMMUNICATION",status:{in:["PENDING","FAILED"]}}}),
  prisma.order.count({where:{isTestData:false,paymentStatus:"PAID",invoices:{none:{status:{notIn:["VOID","CANCELLED"]}}}}}),
  prisma.notification.count({where:{type:"EMAIL_OUTBOX",status:"FAILED"}}),
 ]);
 let missingCost=0,priceExceptions=0,belowFloor=0,withoutRrp=0,stale=0,legacyRrpPremium=0;
 for(const product of products){
  if(!product.recommendedRetail)withoutRrp++;
  if(product.lastSeenAt.getTime()<Date.now()-settings.freshnessHours*3600000)stale++;
  if(!product.costPrice||product.costPrice.lte(0)){missingCost++;continue;}
  try{const p=innozanziPrice(product.costPrice,settings);if(product.recommendedRetail?.gt(p.gross))legacyRrpPremium++;}catch{priceExceptions++;}
 }
 for(const product of locals){try{if(!product.costPrice||product.regularPrice.lt(innozanziPrice(product.costPrice,settings).floor.gross))belowFloor++;}catch{belowFloor++;}}
 console.log(JSON.stringify({capturedAt:new Date().toISOString(),configuredPricing:Boolean(settingsRow),vatRegistered:settings.vatRegistered,
  gateways:{payfast:gatewayConfigured("PAYFAST"),ozow:gatewayConfigured("OZOW")},feeds,
  catalogue:{activeSupplierOffers:products.length,withoutRrp,missingCost,priceExceptions,stale,legacyRrpPremium,publishedLocalProducts:locals.length,localRegularPriceBelowFloorOrMissingCost:belowFloor},
  pendingHostedPaymentsOlderThan30Minutes:pendingPayments,pendingPaidOrderCommunication:pendingCommunication,paidOrdersWithoutActiveInvoice:paidWithoutInvoice,failedEmails:failedEmail,
  limitations:"Local sale prices/variants, merchant contracts, browser journeys, delivery quotes, live scheduler execution and provider delivery are separate verification steps."},null,2));
}
main().catch(()=>{console.error("Read-only launch audit failed; check database access and schema availability.");process.exitCode=1;}).finally(()=>prisma.$disconnect());
