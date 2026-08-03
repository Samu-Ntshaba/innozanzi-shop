import{timingSafeEqual}from"node:crypto";
import{revalidatePath}from"next/cache";
import{runComboAutomation}from"@/domain/combos/automation";

function allowed(request:Request){const expected=process.env.CRON_SECRET;if(!expected)return false;const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";const a=Buffer.from(expected),b=Buffer.from(supplied);return a.length===b.length&&timingSafeEqual(a,b)}
export async function POST(request:Request){
  if(!allowed(request))return Response.json({error:"Unauthorized"},{status:401});
  const result=await runComboAutomation();revalidatePath("/");revalidatePath("/combos");return Response.json(result);
}
