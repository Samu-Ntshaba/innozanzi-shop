import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { provinces } from "./schema";

export const DELIVERY_AREAS_KEY = "delivery.areas.v1";
export const DEFAULT_DELIVERY_PROVINCES = ["Gauteng", "KwaZulu-Natal", "Western Cape"] as const;
const deliveryAreasSchema = z.object({ provinces: z.array(z.enum(provinces)).min(1) });

export type Province = (typeof provinces)[number];

export async function getDeliveryProvinces(): Promise<Province[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: DELIVERY_AREAS_KEY } });
  const parsed = deliveryAreasSchema.safeParse(row?.value);
  return parsed.success ? [...new Set(parsed.data.provinces)] : [...DEFAULT_DELIVERY_PROVINCES];
}

export function deliveryAreasValue(values: FormDataEntryValue[]) {
  return deliveryAreasSchema.parse({ provinces: values.map(String) });
}
