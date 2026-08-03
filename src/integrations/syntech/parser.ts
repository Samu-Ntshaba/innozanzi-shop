import { z } from "zod";

const flexible = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const requiredString = z.preprocess(value => String(value ?? "").trim(), z.string().min(1));
const optionalString = z.preprocess(value => value === null || value === false || value === undefined ? undefined : String(value), z.string().optional());
const productSchema = z.object({
  sku: requiredString, name: optionalString, price: z.number().optional(),
  rrp_incl: z.number().optional(), recommended_margin: z.number().optional(), promo_price: flexible.optional(),
  promo_starts: flexible.optional(), promo_ends: flexible.optional(), cptstock: z.number().optional(),
  jhbstock: z.number().optional(), dbnstock: z.number().optional(), nextshipmenteta: flexible.optional(),
  url: optionalString, description: optionalString, shortdesc: optionalString,
  weight: z.number().optional(), length: z.number().optional(), width: z.number().optional(), height: z.number().optional(),
  featured_image: optionalString, additional_images: z.array(z.string()).nullish().transform(value=>value??[]), categories: optionalString,
  categoriesalt: optionalString, categorytree: optionalString, categorytreealt: optionalString,
  attributes: z.record(z.string(), z.unknown()).nullish().transform(value=>value??{}), last_modified: optionalString,
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
