import { browserMutationGuard, boundedJson } from "@/lib/security/request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { recommend } from "@/domain/ai-shopping/service";

const schema=z.object({message:z.string().trim().min(3).max(Number(process.env.AI_MAX_MESSAGE_LENGTH)||300),source:z.string().trim().max(100).optional()});
const message=(code:string)=>code==="OUT_OF_SCOPE"?"I can help you find products and build the right tech setup.":code==="RATE_LIMIT"?"The AI request limit has been reached. Please try again later or send our team a product request.":code==="DISABLED"?"AI shopping help is temporarily unavailable. You can still browse our products.":code.startsWith("NO_MATCHES|")?code.slice(code.indexOf("|")+1):"We couldn't generate a recommendation right now. You can still browse our products.";

export async function POST(request:Request){
  const blocked=browserMutationGuard(request);if(blocked)return blocked;
  const parsed=schema.safeParse(await boundedJson(request).catch(()=>null));if(!parsed.success)return NextResponse.json({error:`Keep your shopping request under ${Number(process.env.AI_MAX_MESSAGE_LENGTH)||300} characters.`},{status:400});
  try{return NextResponse.json(await recommend(parsed.data.message,parsed.data.source))}catch(error){const code=error instanceof Error?error.message:"UNKNOWN",status=code==="RATE_LIMIT"?429:code==="OUT_OF_SCOPE"?400:code==="DISABLED"?503:code.startsWith("NO_MATCHES|")?404:500;return NextResponse.json({error:message(code),code:["RATE_LIMIT","OUT_OF_SCOPE","DISABLED"].includes(code)?code:code.startsWith("NO_MATCHES|")?"NO_MATCHES":"UNAVAILABLE"},{status})}
}
