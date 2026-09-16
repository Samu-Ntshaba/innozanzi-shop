import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {getTradingRules} from "@/domain/trading/settings";
import {startTradingSession} from "@/domain/trading/sessions";
import {runTradingBatch} from "@/domain/trading/worker";

const allowed=(request:Request)=>{const expected=process.env.CRON_SECRET,supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";if(!expected)return false;const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b)};
export async function POST(request:Request){if(!allowed(request))return NextResponse.json({error:"Unauthorized"},{status:401});const rules=await getTradingRules();if(!rules.monthlyEnabled)return NextResponse.json({status:"disabled"});await startTradingSession({scanType:"MONTHLY"});const results=await runTradingBatch();return NextResponse.json({status:"processed",count:results.length});}
