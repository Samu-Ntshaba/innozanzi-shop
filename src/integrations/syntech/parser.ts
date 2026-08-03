import { z } from "zod";

const flexible = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const productSchema = z.object({
  sku: z.string().trim().min(1), name: z.string().trim().optional(), price: z.number().optional(),
  rrp_incl: z.number().optional(), recommended_margin: z.number().optional(), promo_price: flexible.optional(),
  promo_starts: flexible.optional(), promo_ends: flexible.optional(), cptstock: z.number().optional(),
  jhbstock: z.number().optional(), dbnstock: z.number().optional(), nextshipmenteta: flexible.optional(),
  url: z.string().optional(), description: z.string().optional(), shortdesc: z.string().optional(),
  weight: z.number().optional(), length: z.number().optional(), width: z.number().optional(), height: z.number().optional(),
  featured_image: z.string().optional(), additional_images: z.array(z.string()).optional(), categories: z.string().optional(),
  categoriesalt: z.string().optional(), categorytree: z.string().optional(), categorytreealt: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(), last_modified: z.string().optional(),
}).passthrough();
const feedSchema = z.object({syntechstock:z.object({count:z.number(),currency:z.string(),products:z.array(productSchema)})});

export type SyntechFeedProduct = z.infer<typeof productSchema>;
export type SyntechFeed = z.infer<typeof feedSchema>;
export const parseSyntechFeed = (input:string):SyntechFeed => feedSchema.parse(JSON.parse(input));
export const isFullSyntechProduct = (row:SyntechFeedProduct) => Boolean(row.name);
export function parseFeedDate(value:unknown){
  if(typeof value!=="string"||!value.trim())return null;
  const date=new Date(value.includes("T")?value:`${value.replace(" ","T")}+02:00`);
  return Number.isNaN(date.valueOf())?null:date;
}
export function stringAttribute(attributes:Record<string,unknown>|undefined,...keys:string[]){
  for(const key of keys){const value=attributes?.[key];if(typeof value==="string"||typeof value==="number")return String(value)}
  return null;
}
