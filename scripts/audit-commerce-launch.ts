import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { commerceSchema } from "../src/domain/commerce/config";
import { pricingImpact } from "../src/domain/commerce/impact";
import { innozanziPrice } from "../src/domain/commerce/engine";
import { gatewayConfigured } from "../src/integrations/payments/approved-gateways";
import { PARTNER_SALES_SETTINGS_KEY, partnerSalesSettingsSchema } from "../src/domain/partner-sales/settings";

// Read-only. Output is aggregated; never print credentials, feed URLs or customer data.
async function main(){
 const settingsRow=await prisma.siteSetting.findUnique({where:{key:"commerce.pricing.v1"}});
 const settings=commerceSchema.parse(settingsRow?.value??{});
 if(process.argv.includes("--diagnose-pricing")){
  const started=Date.now();console.log("Preview",await pricingImpact(settings),"elapsedMs",Date.now()-started);
  for(const cast of [false,true]){
   try{const result=await prisma.$transaction(async tx=>cast?tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('innozanzi.audit.readonly',0))::text AS locked`:tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('innozanzi.audit.readonly',0))`);console.log("Advisory lock",{cast,result});}
   catch(error){console.log("Advisory lock",{cast,error:error instanceof Error?error.message:"Unknown error"});}
  }
  return;
 }
 const [feeds,products,locals,pendingPayments,pendingTestPayments,paidUnfinalized,paidUnfinalizedTest,communicationRows,failedRecovery,paidWithoutInvoice,failedEmail,duplicateRows]=await Promise.all([
  prisma.supplierFeed.findMany({select:{provider:true,enabled:true,lastSuccessAt:true,supplier:{select:{purchasingEnabled:true,approvalStatus:true}}}}),
  prisma.supplierCatalogueProduct.findMany({where:{active:true},select:{costPrice:true,recommendedRetail:true,stock:true,lastSeenAt:true}}),
  prisma.product.findMany({where:{deletedAt:null,status:"PUBLISHED",isTestData:false},select:{costPrice:true,regularPrice:true}}),
  prisma.payment.count({where:{provider:{in:["OZOW","PAYFAST"]},status:"PENDING",createdAt:{lt:new Date(Date.now()-30*60000)},order:{isTestData:false}}}),
  prisma.payment.count({where:{provider:{in:["OZOW","PAYFAST"]},status:"PENDING",createdAt:{lt:new Date(Date.now()-30*60000)},order:{isTestData:true}}}),
  prisma.payment.count({where:{status:"PAID",order:{isTestData:false,OR:[{paymentStatus:"PENDING"},{status:"AWAITING_PAYMENT"}]}}}),
  prisma.payment.count({where:{status:"PAID",order:{isTestData:true,OR:[{paymentStatus:"PENDING"},{status:"AWAITING_PAYMENT"}]}}}),
  prisma.notification.findMany({where:{type:"PAID_ORDER_COMMUNICATION",status:{in:["PENDING","FAILED"]}},select:{id:true,status:true}}),
  prisma.notification.count({where:{type:"VERIFIED_PAYMENT_RECOVERY",status:"FAILED"}}),
  prisma.order.count({where:{isTestData:false,paymentStatus:"PAID",invoices:{none:{status:{notIn:["VOID","CANCELLED"]}}}}}),
  prisma.notification.count({where:{type:"EMAIL_OUTBOX",status:"FAILED"}}),
  prisma.$queryRaw<Array<{duplicates:bigint}>>`SELECT COUNT(*)::bigint AS duplicates FROM (SELECT "inventoryId", "referenceId" FROM "InventoryMovement" WHERE type='RESERVATION' AND "referenceType"='Order' GROUP BY "inventoryId", "referenceId" HAVING COUNT(*) > 1) duplicate_reservations`,
 ]);
 const [partnerSettingRow,activePartnerProfiles,partnerOrphanRows,partnerMismatchRows,partnerDuplicateCommissionRows,partnerIneligiblePayableRows,partnerDuplicatePayoutRows,partnerFailedCommunicationRows,partnerPendingCommunicationRows]=await Promise.all([
  prisma.siteSetting.findUnique({where:{key:PARTNER_SALES_SETTINGS_KEY},select:{value:true}}),
  prisma.partnerSalesProfile.count({where:{status:"ACTIVE",publicCatalogueEnabled:true}}),
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count
    FROM "PartnerQuoteCase" c
    LEFT JOIN "PartnerSalesProfile" p ON p.id=c."profileId"
    LEFT JOIN "PartnerClient" pc ON pc.id=c."partnerClientId"
    LEFT JOIN "Order" o ON o."partnerQuoteCaseId"=c.id
    WHERE p.id IS NULL OR pc.id IS NULL OR (c.status IN ('PAID','ORDER_IN_PROGRESS','COMPLETED') AND o.id IS NULL)`,
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM (
    SELECT p.id FROM "Payment" p LEFT JOIN "Order" o ON o.id=p."orderId"
    WHERE p."partnerQuoteCaseId" IS NOT NULL AND (o.id IS NULL OR o."partnerQuoteCaseId" IS DISTINCT FROM p."partnerQuoteCaseId")
    UNION ALL
    SELECT o.id FROM "Order" o LEFT JOIN "Payment" p ON p."orderId"=o.id AND p."partnerQuoteCaseId"=o."partnerQuoteCaseId"
    WHERE o."partnerQuoteCaseId" IS NOT NULL AND p.id IS NULL
  ) mismatches`,
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM (
    SELECT "caseId" FROM "PartnerCommission" GROUP BY "caseId" HAVING COUNT(*) > 1
  ) duplicate_commissions`,
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count
    FROM "PartnerCommission" pc JOIN "Order" o ON o.id=pc."orderId"
    WHERE pc.status='PAYABLE'
      AND (o."paymentStatus" <> 'PAID' OR o.status NOT IN ('DELIVERED','COMPLETED') OR NOT EXISTS (
        SELECT 1 FROM "AuditLog" a WHERE a.action='order.economics.reconcile' AND a."entityType"='Order' AND a."entityId"=o.id
      ))`,
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM (
    SELECT "commissionId" FROM "PartnerPayoutItem" WHERE status <> 'CANCELLED' GROUP BY "commissionId" HAVING COUNT(*) > 1
  ) duplicate_payout_membership`,
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM "Notification"
    WHERE type='EMAIL_OUTBOX' AND status='FAILED' AND data->>'idempotencyKey' LIKE 'partner-sales:%'`,
  prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*)::bigint AS count FROM "Notification"
    WHERE type='EMAIL_OUTBOX' AND status IN ('PENDING','FAILED') AND data->>'idempotencyKey' LIKE 'partner-sales:%'`,
 ]);
 const metric=(rows:Array<{count:bigint}>)=>Number(rows[0]?.count??0);
 const partnerSalesSetting=partnerSalesSettingsSchema.safeParse(partnerSettingRow?.value);
 const partnerSalesEnabled=partnerSalesSetting.success&&partnerSalesSetting.data.enabled;
 const partnerOrphans=metric(partnerOrphanRows);
 const partnerMismatches=metric(partnerMismatchRows);
 const duplicatePartnerCommissions=metric(partnerDuplicateCommissionRows);
 const ineligiblePartnerPayables=metric(partnerIneligiblePayableRows);
 const duplicatePartnerPayoutMembership=metric(partnerDuplicatePayoutRows);
 const failedPartnerCommunication=metric(partnerFailedCommunicationRows);
 const pendingPartnerCommunication=metric(partnerPendingCommunicationRows);
 const communicationTest=communicationRows.length?await prisma.order.count({where:{id:{in:communicationRows.map(row=>row.id)},isTestData:true}}):0;
 const failedCommunication=communicationRows.filter(row=>row.status==="FAILED").length;
 const pendingCommunication=communicationRows.length-failedCommunication;
 const duplicateReservations=Number(duplicateRows[0]?.duplicates??0);
 let missingCost=0,priceExceptions=0,belowFloor=0,withoutRrp=0,stale=0,legacyRrpPremium=0;
 for(const product of products){
  if(!product.recommendedRetail)withoutRrp++;
  if(product.lastSeenAt.getTime()<Date.now()-settings.freshnessHours*3600000)stale++;
  if(!product.costPrice||product.costPrice.lte(0)){missingCost++;continue;}
  try{const p=innozanziPrice(product.costPrice,settings);if(product.recommendedRetail?.gt(p.gross))legacyRrpPremium++;}catch{priceExceptions++;}
 }
 for(const product of locals){try{if(!product.costPrice||product.regularPrice.lt(innozanziPrice(product.costPrice,settings).floor.gross))belowFloor++;}catch{belowFloor++;}}
 const configuredPricing=Boolean(settingsRow),blockers:string[]=[];
 if(!configuredPricing)blockers.push("ACTIVE_PRICING_CONFIGURATION_MISSING");
 if(pendingPayments)blockers.push("STALE_HOSTED_PAYMENTS");
 if(paidUnfinalized)blockers.push("PAID_ORDERS_NOT_FINALIZED");
 if(failedRecovery)blockers.push("FAILED_VERIFIED_PAYMENT_RECOVERY");
 if(failedCommunication)blockers.push("FAILED_PAID_ORDER_COMMUNICATION");
 if(duplicateReservations)blockers.push("DUPLICATE_INVENTORY_RESERVATIONS");
 if(partnerMismatches)blockers.push("PARTNER_QUOTATION_PAYMENT_ORDER_MISMATCH");
 if(duplicatePartnerCommissions)blockers.push("DUPLICATE_PARTNER_COMMISSIONS");
 if(ineligiblePartnerPayables)blockers.push("INELIGIBLE_PARTNER_PAYABLE_COMMISSIONS");
 if(duplicatePartnerPayoutMembership)blockers.push("DUPLICATE_PARTNER_PAYOUT_MEMBERSHIP");
 if(failedPartnerCommunication)blockers.push("FAILED_PARTNER_COMMUNICATION");
 console.log(JSON.stringify({capturedAt:new Date().toISOString(),configuredPricing,vatRegistered:settings.vatRegistered,ready:blockers.length===0,blockers,
  gateways:{payfast:gatewayConfigured("PAYFAST"),ozow:gatewayConfigured("OZOW")},feeds,
  catalogue:{activeSupplierOffers:products.length,withoutRrp,missingCost,priceExceptions,stale,legacyRrpPremium,publishedLocalProducts:locals.length,localRegularPriceBelowFloorOrMissingCost:belowFloor},
  pendingHostedPaymentsOlderThan30Minutes:pendingPayments,paidUnfinalized,failedRecovery,pendingPaidOrderCommunication:pendingCommunication,failedCommunication,duplicateReservations,paidOrdersWithoutActiveInvoice:paidWithoutInvoice,failedEmails:failedEmail,
  testData:{pendingHostedPaymentsOlderThan30Minutes:pendingTestPayments,paidUnfinalized:paidUnfinalizedTest,paidOrderCommunication:communicationTest},
  partnerSales:{featureEnabled:partnerSalesEnabled,activeProfiles:activePartnerProfiles,orphanCases:partnerOrphans,quotationPaymentOrderMismatches:partnerMismatches,duplicateCommissions:duplicatePartnerCommissions,ineligiblePayableCommissions:ineligiblePartnerPayables,duplicatePayoutMembership:duplicatePartnerPayoutMembership,pendingCommunications:pendingPartnerCommunication,failedCommunications:failedPartnerCommunication},
  limitations:"Local sale prices/variants, merchant contracts, browser journeys, delivery quotes, live scheduler execution and provider delivery are separate verification steps."},null,2));
 if(blockers.length)throw new Error("READINESS_BLOCKERS");
}
main().catch(error=>{if(error instanceof Error&&error.message==="READINESS_BLOCKERS"){console.error("Launch blockers found; reconcile them before release.");process.exitCode=2;}else{console.error("Read-only launch audit failed; check database access and schema availability.");process.exitCode=1;}}).finally(()=>prisma.$disconnect());
