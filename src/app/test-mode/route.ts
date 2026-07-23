import { NextResponse } from "next/server";
import { isTestModeEnvironment, testModeUrl } from "@/lib/test-mode";

export function GET(request:Request) {
  if (isTestModeEnvironment()) return NextResponse.redirect(new URL("/",request.url));
  const target=testModeUrl("/");
  if(!target)return NextResponse.json({error:"Test Mode is not configured. Set TEST_MODE_URL to the isolated test deployment."},{status:503});
  return NextResponse.redirect(target);
}
