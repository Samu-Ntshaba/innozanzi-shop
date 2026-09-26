import { NextResponse } from "next/server";
import { requirePermission } from "@/domain/auth/session";
import { registerSalesPartner, registerSalesPartnerSchema } from "@/domain/partnerships/register-partner";
import { boundedFormData, browserMutationGuard } from "@/lib/security/request";
import { publicSiteUrl } from "@/lib/public-site-url";

export async function POST(request: Request) {
  const guard=browserMutationGuard(request,"application/x-www-form-urlencoded");
  if(guard)return guard;
  const context = await requirePermission("partnership.partner.manage");
  let form:FormData;
  try{form=await boundedFormData(request,32_768);}catch{return new Response("Request body too large.",{status:413});}
  const parsed = registerSalesPartnerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.redirect(new URL("/admin/partnerships/partners/new?error=invalid", publicSiteUrl()), 303);
  try {
    const result = await registerSalesPartner(parsed.data, { id: context.user.id, name: context.user.name, email: context.user.email });
    return NextResponse.redirect(new URL(`/admin/partnerships/partners/${result.partnerId}?registered=1`, publicSiteUrl()), 303);
  } catch (error) {
    const code = error instanceof Error && error.message.includes("already") ? "duplicate" : "failed";
    return NextResponse.redirect(new URL(`/admin/partnerships/partners/new?error=${code}`, publicSiteUrl()), 303);
  }
}
