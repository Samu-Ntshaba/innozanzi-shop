import { NextResponse } from "next/server";
import { z } from "zod";
import { recommend } from "@/domain/ai-shopping/service";

const schema=z.object({message:z.string().trim().min(3).max(Number(process.env.AI_MAX_MESSAGE_LENGTH)||300),source:z.string().trim().max(100).optional()});
const message=(code:string)=>code==="OUT_OF_SCOPE"?"I can help you find products and build the right tech setup.":code==="RATE_LIMIT"?"You have used today's AI shopping requests. Sign in or come back tomorrow.":code==="DISABLED"?"AI shopping help is temporarily unavailable. You can still browse our products.":code==="NO_MATCHES"?"I couldn't find an in-stock match right now. Try a broader request or browse our products.":"We couldn't generate a recommendation right now. You can still browse our products.";

export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:`Keep your shopping request under ${Number(process.env.AI_MAX_MESSAGE_LENGTH)||300} characters.`},{status:400});
  try{return NextResponse.json(await recommend(parsed.data.message,parsed.data.source))}catch(error){const code=error instanceof Error?error.message:"UNKNOWN",status=code==="RATE_LIMIT"?429:code==="OUT_OF_SCOPE"?400:code==="DISABLED"?503:500;return NextResponse.json({error:message(code),code},{status})}
}
