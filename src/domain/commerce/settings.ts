import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { commerceSchema, DEFAULT_COMMERCE } from "./config";
export const getCommerceSettings=cache(async()=>{const row=await prisma.siteSetting.findUnique({where:{key:"commerce.pricing.v1"}});return row?commerceSchema.parse(row.value):DEFAULT_COMMERCE;});
