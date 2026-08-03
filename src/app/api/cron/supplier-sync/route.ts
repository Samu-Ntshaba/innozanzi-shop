import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncSyntechFeed } from "@/integrations/syntech/feed";
const valid=(request:Request)=>{const expected=process.env.CRON_SECRET;const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!expected||!supplied||expected.length!==supplied.length)return false;return timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))};
export async function POST(request:Request){if(!valid(request))return NextResponse.json({error:"Unauthorized"},{status:401});try{return NextResponse.json(await syncSyntechFeed("INCREMENTAL"))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Supplier sync failed"},{status:500})}}
