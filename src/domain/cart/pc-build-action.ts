"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "./service";

export async function addPcBuildToCart(formData:FormData){
  const ctx=await requireUser();
  const ids=z.array(z.string().uuid()).min(6).max(20).parse(JSON.parse(z.string().parse(formData.get("productIds"))));
  const unique=[...new Set(ids)];
  const products=await prisma.supplierCatalogueProduct.findMany({where:{id:{in:unique},active:true,availability:"IN_STOCK",stock:{gt:0}}});
  if(products.length!==unique.length)redirect("/build-a-pc?error=stock");
  const cart=await getOrCreateCart();
  const candidates=await prisma.pcProject.findMany({where:{userId:ctx.user.id,status:{not:"COMPLETE"}},include:{items:true},orderBy:{updatedAt:"desc"},take:10});
  const project=candidates.find(row=>unique.every(id=>row.items.some(item=>item.supplierProductId===id)));
  await prisma.$transaction([prisma.cart.update({where:{id:cart.id},data:{pcProjectId:project?.id??null}}),...products.map(product=>prisma.supplierCartItem.upsert({where:{cartId_supplierId_supplierProductId:{cartId:cart.id,supplierId:product.supplierId,supplierProductId:product.supplierProductId}},create:{cartId:cart.id,supplierId:product.supplierId,supplierProductId:product.supplierProductId,supplierSku:product.supplierSku,quantity:1},update:{quantity:1}}))]);
  revalidatePath("/cart");
  redirect("/cart?status=build-added");
}
