import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";

const schema=z.object({eventType:z.enum(["IMPRESSION","VIEW","SEARCH","GAMING_VISIT","BUILD_VISIT","PC_COMPONENT_SELECTED","CART_ADD","CART_REMOVE","WISHLIST_ADD","WISHLIST_REMOVE","PURCHASE","RECOMMENDATION_IMPRESSION","RECOMMENDATION_CLICK","NOT_INTERESTED"]),entityType:z.string().trim().min(1).max(50),entityId:z.string().trim().max(200).optional(),category:z.string().trim().max(160).optional(),brand:z.string().trim().max(120).optional(),searchTerm:z.string().trim().max(160).optional(),price:z.number().nonnegative().max(100_000_000).optional(),specification:z.record(z.string(),z.unknown()).optional(),recommendationId:z.string().trim().max(100).optional(),context:z.string().trim().max(100).optional()});

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid recommendation event"},{status:400});
  const auth=await getAuthContext(),existing=request.headers.get("cookie")?.match(/(?:^|; )innozanzi-rec=([^;]+)/)?.[1],sessionId=existing&&existing.length<=100?decodeURIComponent(existing):randomUUID();
  await prisma.recommendationEvent.create({data:{...parsed.data,userId:auth?.user.id??null,sessionId,specification:parsed.data.specification?JSON.parse(JSON.stringify(parsed.data.specification)):undefined}});
  const response=NextResponse.json({accepted:true});if(!existing)response.cookies.set("innozanzi-rec",sessionId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*180});return response;
}
