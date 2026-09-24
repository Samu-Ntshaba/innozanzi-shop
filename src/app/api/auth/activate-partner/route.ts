import { NextResponse } from "next/server";
import { activatePartnerInvitation } from "@/domain/auth/partner-activation";

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
};

export async function POST(request: Request) {
  const form = await request.formData();
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
  return NextResponse.redirect(new URL("/activate-account?error=invalid", request.url), 303);
}
