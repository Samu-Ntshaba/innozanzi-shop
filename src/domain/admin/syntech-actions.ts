"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureSyntechFeed, type SyncMode } from "@/integrations/syntech/feed";
import { ensurePinnacleFeed } from "@/integrations/pinnacle/feed";
import { syncAllSuppliers } from "@/integrations/suppliers/registry";
async function run(mode:SyncMode){await requirePermission("products.update");await syncAllSuppliers(mode);revalidatePath("/admin/syntech");revalidatePath("/admin/feed-health");revalidatePath("/admin/products");revalidatePath("/shop")}
export async function runSyntechFullSync(){await run("FULL")}
export async function runSyntechIncrementalSync(){await run("INCREMENTAL")}
export async function testSyntechConnection(){const context=await requirePermission("products.update");const [syntech,pinnacle]=await Promise.all([ensureSyntechFeed(),ensurePinnacleFeed()]);await prisma.auditLog.create({data:{actorId:context.user.id,action:"supplier.feeds.configuration-test",entityType:"SupplierFeed",entityId:syntech.id,metadata:{syntechConfigured:Boolean(process.env.SYNTECH_FULL_FEED_URL&&process.env.SYNTECH_UPDATE_FEED_URL),pinnacleConfigured:Boolean(process.env.PINNACLE_XML_FEED_URL),pinnacleFeedId:pinnacle.id}}});revalidatePath("/admin/syntech")}
