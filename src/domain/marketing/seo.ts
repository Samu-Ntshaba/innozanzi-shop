import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isTestModeEnvironment } from "@/lib/test-mode";

export type GlobalSeoSettings={
  siteTitle:string;titleTemplate:string;description:string;businessName:string;siteUrl:string;
  defaultImage:string;logo:string;twitter:string;facebook:string;linkedin:string;instagram:string;
  phone:string;email:string;address:string;serviceAreas:string;googleVerification:string;bingVerification:string;
};

const defaults:GlobalSeoSettings={
  siteTitle:"Innozanzi | Business Technology Partner",titleTemplate:"%s | Innozanzi",
  description:"Fast business technology quotations, expert advice, delivery, installation and ongoing support across South Africa.",
  businessName:"Innozanzi",siteUrl:process.env.NEXT_PUBLIC_SITE_URL??"https://shop.innozanzi.co.za",
  defaultImage:process.env.EMAIL_LOGO_URL??"/icon.png",logo:process.env.EMAIL_LOGO_URL??"/icon.png",
  twitter:"",facebook:"",linkedin:"",instagram:"",phone:"+27 71 238 4185",email:"support@innozanzi.co.za",
  address:"Ground Floor, Waterstone Building, Stonemill Office Park, 300 Acacia Road, Darrenwood, Randburg, Johannesburg, 2195",
  serviceAreas:"South Africa",googleVerification:"",bingVerification:"",
};

export async function globalSeoSettings():Promise<GlobalSeoSettings>{
  let rows:{key:string;value:unknown}[]=[];try{rows=await prisma.marketingSetting.findMany({where:{key:{startsWith:"seo."}},select:{key:true,value:true}})}catch(error){console.error("Marketing SEO settings unavailable; using safe defaults",error)}
  const settings={...defaults} as Record<string,string>;
  for(const row of rows){const key=row.key.slice(4);if(key in settings&&typeof row.value==="string")settings[key]=row.value}
  return settings as GlobalSeoSettings;
}

export function absoluteUrl(path:string,base:string){try{return new URL(path,base).toString()}catch{return base}}

export async function entityMetadata(input:{entityType:string;entityId:string;path:string;title:string;description?:string|null;image?:string|null;keywords?:string[]}):Promise<Metadata>{
  const [global,seo]=await Promise.all([globalSeoSettings(),prisma.seoRecord.findUnique({where:{entityType_entityId:{entityType:input.entityType,entityId:input.entityId}}})]);
  const title=seo?.title||input.title||global.siteTitle;const description=seo?.description||input.description||global.description;
  const canonical=seo?.canonicalUrl||absoluteUrl(input.path,global.siteUrl);const image=seo?.openGraphImage||seo?.twitterImage||input.image||global.defaultImage;
  const noIndex=isTestModeEnvironment()||seo?.isTestData||seo?.indexable===false;
  return{title,description,keywords:[...(input.keywords??[]),seo?.primaryKeyword??"",...(seo?.secondaryKeywords??[])].filter(Boolean),alternates:{canonical},robots:{index:!noIndex,follow:!isTestModeEnvironment()&&(seo?.followLinks??true)},openGraph:{type:"website",title:seo?.openGraphTitle||title,description:seo?.openGraphDescription||description,url:canonical,siteName:global.businessName,images:image?[{url:absoluteUrl(image,global.siteUrl),alt:title}]:undefined},twitter:{card:"summary_large_image",site:global.twitter||undefined,title:seo?.twitterTitle||seo?.openGraphTitle||title,description:seo?.twitterDescription||seo?.openGraphDescription||description,images:image?[absoluteUrl(seo?.twitterImage||image,global.siteUrl)]:undefined}};
}

export function safeJsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c")}

export async function organisationJsonLd(){
  const global=await globalSeoSettings();return{"@context":"https://schema.org","@type":["Organization","LocalBusiness"],"@id":`${global.siteUrl}/#organization`,name:global.businessName,url:global.siteUrl,logo:absoluteUrl(global.logo,global.siteUrl),email:global.email,telephone:global.phone,address:{"@type":"PostalAddress",streetAddress:global.address,addressCountry:"ZA"},areaServed:global.serviceAreas.split(",").map(name=>({"@type":"Country",name:name.trim()})),sameAs:[global.facebook,global.linkedin,global.instagram].filter(Boolean)};
}
