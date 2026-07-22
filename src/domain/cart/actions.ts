"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentCart, getOrCreateCart } from "./service";

const addSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), quantity: z.coerce.number().int().min(1).max(99) });

export async function addToCartAction(formData: FormData) {
  const variantValue = formData.get("variantId");
  const parsed = addSchema.safeParse({ productId: formData.get("productId"), variantId: typeof variantValue === "string" && variantValue ? variantValue : undefined, quantity: formData.get("quantity") });
  if (!parsed.success) redirect("/cart?error=invalid-item");

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: "PUBLISHED", deletedAt: null },
    include: { variants: { where: { id: parsed.data.variantId, isActive: true }, include: { inventory: true } }, inventory: { where: { variantId: null }, take: 1 } },
  });
  if (!product || (product.variants.length > 0 && !parsed.data.variantId)) redirect("/cart?error=unavailable");
  const inventory = parsed.data.variantId ? product.variants[0]?.inventory : product.inventory[0];
  const available = inventory ? inventory.onHand - inventory.reserved : 0;
  if (available < parsed.data.quantity) redirect("/cart?error=stock");

  const cart = await getOrCreateCart();
  const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: product.id, variantId: parsed.data.variantId ?? null } });
  const newQuantity = (existing?.quantity ?? 0) + parsed.data.quantity;
  if (newQuantity > available) redirect("/cart?error=stock");
  if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
  else await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, variantId: parsed.data.variantId, quantity: parsed.data.quantity } });
  revalidatePath("/cart");
  redirect("/cart?status=added");
}

export async function updateCartItemAction(formData: FormData) {
  const parsed = z.object({ itemId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(99) }).safeParse({ itemId: formData.get("itemId"), quantity: formData.get("quantity") });
  if (!parsed.success) return;
  const cart = await getCurrentCart();
  const item = cart?.items.find((entry) => entry.id === parsed.data.itemId);
  if (!item) return;
  const inventory = item.variant?.inventory ?? item.product.inventory[0];
  if (!inventory || inventory.onHand - inventory.reserved < parsed.data.quantity) redirect("/cart?error=stock");
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: parsed.data.quantity } });
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string") return;
  const cart = await getCurrentCart();
  if (!cart?.items.some((item) => item.id === itemId)) return;
  await prisma.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
}
