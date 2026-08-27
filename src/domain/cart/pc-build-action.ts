"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "./service";

export async function addPcBuildToCart(formData:FormData){
  await requireUser();
  const ids=z.array(z.string().uuid()).min(6).max(20).parse(JSON.parse(z.string().parse(formData.get("productIds"))));
  const unique=[...new Set(ids)];
  const products=await prisma.supplierCatalogueProduct.findMany({where:{id:{in:unique},active:true,availability:"IN_STOCK",stock:{gt:0}}});
  if(products.length!==unique.length)redirect("/build-a-pc?error=stock");
  const cart=await getOrCreateCart();
  await prisma.$transaction(products.map(product=>prisma.supplierCartItem.upsert({where:{cartId_supplierId_supplierProductId:{cartId:cart.id,supplierId:product.supplierId,supplierProductId:product.supplierProductId}},create:{cartId:cart.id,supplierId:product.supplierId,supplierProductId:product.supplierProductId,supplierSku:product.supplierSku,quantity:1},update:{quantity:1}})));
  revalidatePath("/cart");
  redirect("/cart?status=build-added");
}
