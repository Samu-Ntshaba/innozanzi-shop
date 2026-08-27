import { prisma } from "@/lib/prisma";
import { isDailySpecial, supplierRetailPrice } from "./retail-pricing";

export type PcBuildStepKey = "cpu" | "motherboard" | "memory" | "storage" | "graphics" | "power" | "case" | "cooling" | "monitor" | "keyboard" | "mouse" | "audio";
export type PcBuilderProduct = { id:string;name:string;slug:string;sku:string;brand:string|null;image:string|null;price:string;stock:number;categoryPath:string;specifications:Record<string,string> };
export type PcBuildStep = { key:PcBuildStepKey;title:string;shortTitle:string;description:string;required:boolean;setupOnly?:boolean;filterHints:string[];products:PcBuilderProduct[] };

const definitions:Omit<PcBuildStep,"products">[] = [
  {key:"cpu",title:"Choose your processor",shortTitle:"CPU",description:"The processor is the brain of your PC.",required:true,filterHints:["socket","cores","processor model","frequency"]},
  {key:"motherboard",title:"Choose your motherboard",shortTitle:"Motherboard",description:"Connects every component and determines CPU and memory compatibility.",required:true,filterHints:["socket","memory type","form factor","chipset"]},
  {key:"memory",title:"Choose your memory",shortTitle:"Memory",description:"More RAM helps applications and multitasking run smoothly.",required:true,filterHints:["capacity","memory type","speed"]},
  {key:"storage",title:"Choose your storage",shortTitle:"Storage",description:"Select fast storage for Windows, applications and files.",required:true,filterHints:["capacity","interface","form factor"]},
  {key:"graphics",title:"Choose your graphics",shortTitle:"Graphics",description:"Required for gaming, 3D work and systems without integrated graphics.",required:false,filterHints:["memory","chipset","recommended power"]},
  {key:"power",title:"Choose your power supply",shortTitle:"Power Supply",description:"Provides stable power to every component.",required:true,filterHints:["wattage","efficiency","modular"]},
  {key:"case",title:"Choose your case",shortTitle:"Case",description:"The enclosure that houses and protects your build.",required:true,filterHints:["form factor","colour","size"]},
  {key:"cooling",title:"Choose additional cooling",shortTitle:"Cooling",description:"Optional cooling for quieter operation or demanding workloads.",required:false,filterHints:["socket","radiator size","fan size"]},
  {key:"monitor",title:"Choose your monitor",shortTitle:"Monitor",description:"Complete your setup with the right display.",required:false,setupOnly:true,filterHints:["screen size","resolution","refresh rate"]},
  {key:"keyboard",title:"Choose your keyboard",shortTitle:"Keyboard",description:"Pick a keyboard for work, gaming or everyday use.",required:false,setupOnly:true,filterHints:["connectivity","layout","switch type"]},
  {key:"mouse",title:"Choose your mouse",shortTitle:"Mouse",description:"Choose precise, comfortable control.",required:false,setupOnly:true,filterHints:["connectivity","sensor","buttons"]},
  {key:"audio",title:"Choose your audio",shortTitle:"Audio",description:"Add a headset or speakers to finish your setup.",required:false,setupOnly:true,filterHints:["connectivity","type"]},
];

const paths:Record<PcBuildStepKey,string[]> = {
  cpu:["Components/CPU/"],motherboard:["Components/Motherboards/"],memory:["Components/Memory/Desktop memory"],storage:["Components/Solid state drives/Consumer","Components/Hard disk drives"],graphics:["Components/Graphics cards/"],power:["Components/Power supplies/"],case:["Components/Chassis/"],cooling:["Components/Cooling/"],monitor:["Computer peripherals/Monitors/"],keyboard:["Computer peripherals/Keyboards/"],mouse:["Computer peripherals/Mice/"],audio:["Computer peripherals/Headsets/","Computer peripherals/Speakers"],
};

const stringSpecs=(value:unknown)=>{if(!value||typeof value!=="object"||Array.isArray(value))return{};return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([,entry])=>entry!==null&&entry!==undefined).map(([key,entry])=>[key,typeof entry==="object"?JSON.stringify(entry):String(entry)]))};

export async function getPcBuilderSteps():Promise<PcBuildStep[]> {
  const rows=await prisma.supplierCatalogueProduct.findMany({where:{active:true,availability:"IN_STOCK",stock:{gt:0},costPrice:{gt:0},images:{isEmpty:false},OR:Object.values(paths).flat().map(path=>({categoryPath:{startsWith:path}}))},select:{id:true,name:true,slug:true,supplierSku:true,brand:true,images:true,stock:true,costPrice:true,recommendedRetail:true,promotionalPrice:true,promotionStartsAt:true,promotionEndsAt:true,categoryPath:true,specifications:true},orderBy:{costPrice:"asc"},take:700});
  return definitions.map(step=>({...step,products:rows.filter(product=>paths[step.key].some(path=>product.categoryPath?.startsWith(path))).slice(0,60).map(product=>{const retail=supplierRetailPrice({costPrice:product.costPrice!,recommendedRetail:product.recommendedRetail,promotionalPrice:product.promotionalPrice,promotionStartsAt:product.promotionStartsAt,promotionEndsAt:product.promotionEndsAt,special:isDailySpecial(product.id)});return{id:product.id,name:product.name,slug:product.slug,sku:product.supplierSku,brand:product.brand,image:product.images[0]??null,price:(retail.salePrice??retail.regularPrice).toFixed(2),stock:product.stock,categoryPath:product.categoryPath??"",specifications:stringSpecs(product.specifications)}})}));
}
