import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAllSuppliers } from "@/integrations/suppliers/registry";
const valid=(request:Request)=>{const expected=process.env.CRON_SECRET;const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!expected||!supplied||expected.length!==supplied.length)return false;return timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))};
export async function POST(request:Request){if(!valid(request))return NextResponse.json({error:"Unauthorized"},{status:401});const active=await prisma.supplierSyncRun.findFirst({where:{status:"RUNNING",startedAt:{gt:new Date(Date.now()-30*60_000)}}});if(active)return NextResponse.json({status:"already-running",runId:active.id},{status:202});try{const results=await syncAllSuppliers();return NextResponse.json({results},{status:results.some(r=>r.status==="FAILED")?500:200})}catch{return NextResponse.json({error:"Supplier sync failed"},{status:500})}}
