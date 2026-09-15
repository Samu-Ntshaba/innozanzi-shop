import { timingSafeEqual } from "node:crypto";
import { reconcilePendingPayments } from "@/domain/payments/reconcile-pending";

export const runtime="nodejs";
export async function POST(request:Request){
  const expected=process.env.CRON_SECRET,supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
  if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))return Response.json({error:"Unauthorized"},{status:401});
  return Response.json(await reconcilePendingPayments());
}
