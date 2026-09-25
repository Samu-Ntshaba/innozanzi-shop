import { NextResponse } from "next/server";
import { activatePartnerInvitation } from "@/domain/auth/partner-activation";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

export async function POST(request: Request) {
  const guard=browserMutationGuard(request,"application/x-www-form-urlencoded");
  if(guard)return guard;
  let form:FormData;
  try{form=await boundedFormData(request,8_192);}catch{return new Response("Request body too large.",{status:413});}
  const input = {
    token: field(form, "token"),
    email: field(form, "email"),
    password: field(form, "password"),
    confirmPassword: field(form, "confirmPassword"),
  };
  const result = await activatePartnerInvitation(input);
  if (result.ok) return NextResponse.redirect(new URL("/account/partner", request.url), 303);
  if (result.error === "password") {
    const target = new URL("/activate-account", request.url);
    target.searchParams.set("token", input.token);
    target.searchParams.set("email", input.email);
    target.searchParams.set("error", "password");
    return NextResponse.redirect(target, 303);
  }
  return NextResponse.redirect(new URL("/activate-account?partner=1&error=invalid", request.url), 303);
}
