import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/domain/auth/password";
import { assertDisposableTestDatabase } from "@/lib/test-mode";
import { createSupabaseAdmin } from "@/lib/supabase";

const customerEmail="test.customer@innozanzi.local";
const now=()=>new Date();

export async function clearTestDatabaseBusinessData(){
  assertDisposableTestDatabase();
  await prisma.$transaction(async tx=>{
    await tx.documentDispatch.deleteMany();
    await tx.businessDocument.deleteMany();
    await tx.notification.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.partnerMessage.deleteMany();
    await tx.partnerActivity.deleteMany();
    await tx.partnerRequest.deleteMany();
    await tx.partnership.deleteMany();
    await tx.partnershipApplication.deleteMany();
    await tx.rfqOpportunity.deleteMany();
    await tx.serviceTask.deleteMany();
    await tx.helpDeskTicket.deleteMany();
    await tx.emailCampaign.deleteMany();
    await tx.newsletterSubscriber.deleteMany();
    await tx.review.deleteMany();
    await tx.couponRedemption.deleteMany();
    await tx.invoice.deleteMany();
    await tx.marketingBlock.deleteMany({where:{isTestData:true}});
    await tx.seoRecord.deleteMany({where:{isTestData:true}});
    await tx.mediaAsset.deleteMany({where:{isTestData:true}});
    await tx.testAsset.deleteMany();
    await tx.paymentSubmission.deleteMany();
    await tx.uploadedDocument.deleteMany();
    await tx.order.deleteMany();
    await tx.quotation.deleteMany();
    await tx.quotationRequest.deleteMany();
    await tx.cart.deleteMany();
    await tx.wishlist.deleteMany();
    await tx.coupon.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany({where:{slug:{startsWith:"test-"}}});
    await tx.brand.deleteMany({where:{slug:{startsWith:"test-"}}});
    await tx.homepageBanner.deleteMany();
    await tx.verificationToken.deleteMany();
    await tx.user.deleteMany({where:{accountType:"CUSTOMER"}});
  },{timeout:30_000});
}

export async function generateCatalogue(){
  assertDisposableTestDatabase();
  const assetUrls=await ensureTestAssets();
  const category=await prisma.category.upsert({where:{slug:"test-business-technology"},update:{isActive:true},create:{name:"Test Business Technology",slug:"test-business-technology",description:"Deterministic products for Test Mode.",isActive:true}});
  const brand=await prisma.brand.upsert({where:{slug:"test-innozanzi-labs"},update:{isActive:true},create:{name:"Innozanzi Labs",slug:"test-innozanzi-labs",isActive:true}});
  const products=[
    ["TEST-LAPTOP-001","Test ProBook 14 Business Laptop","test-probook-14-business-laptop","18999",assetUrls[0],12],
    ["TEST-MONITOR-001","Test 27-inch QHD Monitor","test-27-inch-qhd-monitor","5499",assetUrls[1],24],
    ["TEST-NETWORK-001","Test Wi-Fi 6 Business Router","test-wifi-6-business-router","2499",assetUrls[2],18],
    ["TEST-PRINTER-001","Test Office Laser Printer","test-office-laser-printer","6999",assetUrls[3],8],
  ] as const;
  for(const [sku,name,slug,price,image,stock] of products){
    const product=await prisma.product.upsert({where:{sku},update:{name,slug,status:"PUBLISHED",stockStatus:"IN_STOCK",regularPrice:new Decimal(price),deletedAt:null,isTestData:true},create:{categoryId:category.id,brandId:brand.id,name,slug,sku,shortDescription:"Test Mode product for validating the complete quotation and fulfilment journey.",description:"This deterministic record exists only inside the isolated Test Mode database.",regularPrice:new Decimal(price),costPrice:new Decimal(price).mul(.8),vatStatus:"EXEMPT",status:"PUBLISHED",stockStatus:"IN_STOCK",warranty:"Test warranty",deliveryEstimate:"2–5 test business days",isFeatured:true,isNew:true,isPopular:true,isTestData:true,publishedAt:now()}});
    await prisma.productImage.createMany({data:[{productId:product.id,path:image,altText:name,isPrimary:true}],skipDuplicates:true});
    const inventory=await prisma.inventory.findFirst({where:{productId:product.id,variantId:null}});
    if(inventory)await prisma.inventory.update({where:{id:inventory.id},data:{onHand:stock,reserved:2,reorderLevel:4}});
    else await prisma.inventory.create({data:{productId:product.id,onHand:stock,reserved:2,reorderLevel:4}});
  }
  await prisma.homepageBanner.create({data:{title:"TEST MODE: Business technology made simple",subtitle:"Validate quotations, payment, fulfilment and support without touching live customer data.",imagePath:products[0][4],linkUrl:"/shop",buttonLabel:"Browse test catalogue",isActive:true}});
}

export async function generateCustomer(){
  assertDisposableTestDatabase();
  const customer=await prisma.user.upsert({where:{email:customerEmail},update:{status:"ACTIVE",emailVerified:now(),deletedAt:null,isTestData:true},create:{email:customerEmail,name:"Thandi Test Customer",phone:"0710000001",passwordHash:await hashPassword("TestMode!2026"),status:"ACTIVE",emailVerified:now(),isTestData:true,customerProfile:{create:{company:{create:{companyName:"Test Customer Trading (Pty) Ltd",registrationNo:"TEST-2026-001"}}}}}});
  const role=await prisma.role.findUnique({where:{slug:"customer"}});
  if(role)await prisma.userRole.upsert({where:{userId_roleId:{userId:customer.id,roleId:role.id}},update:{},create:{userId:customer.id,roleId:role.id}});
  return customer;
}

export async function generateCommercialJourney(){
  assertDisposableTestDatabase();
  const customer=await prisma.user.findUniqueOrThrow({where:{email:customerEmail}});
  const products=await prisma.product.findMany({where:{sku:{startsWith:"TEST-"}},take:2,orderBy:{sku:"asc"}});
  const request=await prisma.quotationRequest.create({data:{requestNumber:"TEST-QR-001",userId:customer.id,status:"QUOTED",contactName:customer.name??"Test Customer",email:customer.email,phone:customer.phone,companyName:"Test Customer Trading (Pty) Ltd",requirements:"Ten business devices with delivery and setup.",isTestData:true,items:{create:products.map((p,index)=>({productId:p.id,productName:p.name,requestedQuantity:index?2:10}))}}});
  const total=new Decimal("201988");
  const quote=await prisma.quotation.create({data:{quotationNumber:"TEST-QUO-001",quotationRequestId:request.id,customerId:customer.id,status:"SENT",kind:"FINAL",origin:"CUSTOMER_REQUEST",subtotal:total,vatTotal:0,grandTotal:total,validUntil:new Date(Date.now()+7*86400000),terms:"Test quotation valid for seven days.",paymentReference:"TEST-QUO-001",bankDetails:"TEST BANK DETAILS — DO NOT PAY",isTestData:true,items:{create:products.map((p,index)=>({productId:p.id,productName:p.name,sku:p.sku,quantity:index?2:10,unitPrice:p.regularPrice,vatRate:0,vatTotal:0,lineTotal:new Decimal(p.regularPrice).mul(index?2:10)}))}}});
  const order=await prisma.order.create({data:{orderNumber:"TEST-ORD-001",userId:customer.id,email:customer.email,phone:customer.phone,companyName:"Test Customer Trading (Pty) Ltd",subtotal:total,vatTotal:0,grandTotal:total,status:"IN_TRANSIT",paymentStatus:"PAID",paymentMethod:"EFT",placedAt:now(),isTestData:true,items:{create:products.map((p,index)=>({productId:p.id,productName:p.name,sku:p.sku,quantity:index?2:10,unitPrice:p.regularPrice,vatRate:0,vatTotal:0,lineTotal:new Decimal(p.regularPrice).mul(index?2:10)}))},addresses:{create:{type:"DELIVERY",recipient:customer.name??"Test Customer",companyName:"Test Customer Trading (Pty) Ltd",line1:"1 Test Avenue",city:"Johannesburg",province:"Gauteng",postalCode:"2000"}},deliveryEvents:{create:[{status:"PAYMENT_VERIFIED",publicNote:"Test payment verified."},{status:"PROCESSING",publicNote:"Test order entered processing."},{status:"DISPATCHED",publicNote:"Test order dispatched."},{status:"IN_TRANSIT",publicNote:"Test delivery is in transit."}]},shipments:{create:{deliveryCompany:"Test Courier Services",trackingNumber:"TEST-TRACK-001",trackingUrl:"https://example.com/test-tracking",estimatedDeliveryAt:new Date(Date.now()+2*86400000),deliveryNoteNumber:"TEST-DN-001",status:"IN_TRANSIT"}}}});
  await prisma.quotation.update({where:{id:quote.id},data:{convertedOrderId:order.id,status:"CONVERTED"}});
  const invoice=await prisma.invoice.create({data:{invoiceNumber:"TEST-INV-001",quotationId:quote.id,orderId:order.id,status:"ISSUED",origin:"AUTOMATED",customerName:customer.name??"Test Customer",customerEmail:customer.email,companyName:"Test Customer Trading (Pty) Ltd",subtotal:total,vatTotal:0,grandTotal:total,balanceDue:total,issuedAt:now(),dueAt:new Date(Date.now()+7*86400000),notes:"Test Mode invoice — no payment required.",isTestData:true,items:{create:products.map((p,index)=>({description:p.name,quantity:index?2:10,unitPrice:p.regularPrice,vatRate:0,vatTotal:0,lineTotal:new Decimal(p.regularPrice).mul(index?2:10),sortOrder:index,isTestData:true}))}}});
  await prisma.deliveryNote.create({data:{deliveryNoteNumber:"TEST-DOC-DN-001",orderId:order.id,invoiceId:invoice.id,origin:"AUTOMATED",status:"READY_FOR_DELIVERY",customerName:customer.name??"Test Customer",customerEmail:customer.email,companyName:"Test Customer Trading (Pty) Ltd",deliveryAddress:"1 Test Avenue, Johannesburg, Gauteng, 2000",deliveryDate:new Date(Date.now()+2*86400000),deliveryMethod:"Test Courier Services",reference:order.orderNumber,isTestData:true,items:{create:products.map((p,index)=>({description:p.name,quantity:index?2:10,sortOrder:index,isTestData:true}))}}});
}

async function ensureTestAssets(){
  const fallback=["laptop","monitor","router","printer"].map(x=>`https://placehold.co/1200x800/082f49/ffffff?text=Test+${x}`);
  try{const supabase=createSupabaseAdmin();const bucket="test-assets";if(!(await supabase.storage.getBucket(bucket)).data){const created=await supabase.storage.createBucket(bucket,{public:true,fileSizeLimit:1024*1024});if(created.error)throw created.error}const urls:string[]=[];for(const [index,label] of ["Laptop","Monitor","Router","Printer"].entries()){const path=`catalogue/test-${label.toLowerCase()}.svg`;const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#082f49"/><circle cx="600" cy="350" r="190" fill="#0ea5e9"/><text x="600" y="380" text-anchor="middle" font-family="Arial" font-size="64" fill="white">TEST ${label.toUpperCase()}</text><text x="600" y="470" text-anchor="middle" font-family="Arial" font-size="28" fill="white">Innozanzi isolated data</text></svg>`;const bytes=new TextEncoder().encode(svg);const uploaded=await supabase.storage.from(bucket).upload(path,bytes,{contentType:"image/svg+xml",upsert:true});if(uploaded.error)throw uploaded.error;const publicUrl=supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;await prisma.testAsset.upsert({where:{key:`catalogue-${label.toLowerCase()}`},update:{publicUrl,size:bytes.length},create:{key:`catalogue-${label.toLowerCase()}`,type:"PRODUCT_IMAGE",bucket,path,publicUrl,mimeType:"image/svg+xml",size:bytes.length}});urls[index]=publicUrl}return urls}catch(error){console.error("Reusable test asset pool unavailable; using deterministic placeholders",error);return fallback}
}

export async function generateServiceAndRfq(actorId:string){
  assertDisposableTestDatabase();
  const customer=await prisma.user.findUniqueOrThrow({where:{email:customerEmail}});
  const department=await prisma.department.findFirst({where:{name:"Technical Support"}});
  await prisma.helpDeskTicket.create({data:{ticketNumber:"TEST-SUP-001",name:customer.name??"Test Customer",email:customer.email,phone:customer.phone,customerId:customer.id,departmentId:department?.id,sourceChannel:"WEB",category:"TECHNICAL",subject:"Help deploying the test laptops",message:"Please schedule setup and deployment assistance for the test order.",status:"IN_PROGRESS",priority:"HIGH",dueAt:new Date(Date.now()+86400000),activities:{create:[{type:"CUSTOMER_MESSAGE",message:"Please schedule setup assistance."},{actorId,type:"STAFF_REPLY",message:"A test technician has been assigned."}]},tasks:{create:{title:"Schedule test deployment",description:"Contact the test customer and confirm a deployment window.",priority:"HIGH",dueAt:new Date(Date.now()+86400000),createdById:actorId,assignedToId:actorId}}}});
  await prisma.rfqOpportunity.create({data:{referenceNumber:"TEST-RFQ-2026-001",type:"RFQ",status:"PRICING_IN_PROGRESS",title:"Test office technology refresh",description:"Deterministic RFQ used to validate source review and pricing.",issuingOrganisation:"Test Municipality",closingAt:new Date(Date.now()+5*86400000),priority:"HIGH",tags:["TEST_MODE"],createdById:actorId,lineItems:{create:{description:"Business laptops",quantity:20,unitCost:15000,pricingMethod:"MARKUP",pricingPercent:5,costSubtotal:300000,sellingPricePerUnit:15750,sellingSubtotal:315000,vatAmount:0,profit:15000}}}});
  await prisma.newsletterSubscriber.create({data:{email:"test.newsletter@innozanzi.local",name:"Test Newsletter Contact",source:"test-mode"}});
}

export async function testDataCounts(){
  const [products,customers,quotes,orders,tickets,rfqs]=await Promise.all([prisma.product.count(),prisma.user.count({where:{accountType:"CUSTOMER"}}),prisma.quotation.count(),prisma.order.count(),prisma.helpDeskTicket.count(),prisma.rfqOpportunity.count()]);
  return {products,customers,quotes,orders,tickets,rfqs};
}
