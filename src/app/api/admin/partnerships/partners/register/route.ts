import { NextResponse } from "next/server";
import { requirePermission } from "@/domain/auth/session";
import { registerSalesPartner, registerSalesPartnerSchema } from "@/domain/partnerships/register-partner";

export async function POST(request: Request) {
  const context = await requirePermission("partnership.partner.manage");
  const parsed = registerSalesPartnerSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return NextResponse.redirect(new URL("/admin/partnerships/partners/new?error=invalid", request.url), 303);
  try {
    const result = await registerSalesPartner(parsed.data, { id: context.user.id, name: context.user.name, email: context.user.email });
    return NextResponse.redirect(new URL(`/admin/partnerships/partners/${result.partnerId}?registered=1`, request.url), 303);
  } catch (error) {
    const code = error instanceof Error && error.message.includes("already") ? "duplicate" : "failed";
    return NextResponse.redirect(new URL(`/admin/partnerships/partners/new?error=${code}`, request.url), 303);
  }
}
