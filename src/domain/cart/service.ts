import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/domain/auth/session";

const CART_COOKIE = "innozanzi-cart";
const CART_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;

async function identity() {
  const auth = await getAuthContext();
  const cookieStore = await cookies();
  return { userId: auth?.user.id, token: cookieStore.get(CART_COOKIE)?.value, cookieStore };
}

export async function getCurrentCart() {
  const { userId, token } = await identity();
  if (!userId && !token) return null;
  return prisma.cart.findFirst({
    where: { status: "ACTIVE", ...(userId ? { userId } : { token }) },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          product: { include: { images: { where: { isPrimary: true }, take: 1 }, inventory: { where: { variantId: null }, take: 1 } } },
          variant: { include: { inventory: true } },
        },
      },
    },
  });
}

export async function getOrCreateCart() {
  const { userId, token, cookieStore } = await identity();
  const existing = await prisma.cart.findFirst({ where: { status: "ACTIVE", ...(userId ? { userId } : { token }) } });
  if (existing) return existing;

  const newToken = userId ? undefined : randomBytes(24).toString("base64url");
  const cart = await prisma.cart.create({
    data: { userId, token: newToken, expiresAt: new Date(Date.now() + CART_DURATION_MS) },
  });
  if (newToken) {
    cookieStore.set(CART_COOKIE, newToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CART_DURATION_MS / 1_000 });
  }
  return cart;
}
