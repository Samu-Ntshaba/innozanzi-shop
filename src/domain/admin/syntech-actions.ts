"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { syncSyntechFeed } from "@/integrations/syntech/feed";
export async function runSyntechSync(){const context=await requirePermission("products.update");await syncSyntechFeed(context.user.id);revalidatePath("/admin/syntech");revalidatePath("/admin/products")}
