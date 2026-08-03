"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureSyntechFeed, syncSyntechFeed, type SyncMode } from "@/integrations/syntech/feed";
async function run(mode:SyncMode){const context=await requirePermission("products.update");await syncSyntechFeed(mode,context.user.id);revalidatePath("/admin/syntech");revalidatePath("/admin/products");revalidatePath("/shop")}
export async function runSyntechFullSync(){await run("FULL")}
export async function runSyntechIncrementalSync(){await run("INCREMENTAL")}
export async function testSyntechConnection(){const context=await requirePermission("products.update");const feed=await ensureSyntechFeed();await prisma.auditLog.create({data:{actorId:context.user.id,action:"supplier.syntech.connection-test",entityType:"SupplierFeed",entityId:feed.id,metadata:{configured:Boolean(process.env.SYNTECH_FULL_FEED_URL&&process.env.SYNTECH_UPDATE_FEED_URL)}}});revalidatePath("/admin/syntech")}
