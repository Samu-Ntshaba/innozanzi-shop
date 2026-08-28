import Link from "next/link";
import { AlertCircle, BadgeCheck } from "lucide-react";
import { verifyEmailAction } from "../actions";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; token?: string; error?: string }> }) {
  const { email = "", token = "", error } = await searchParams;
  const invalid=Boolean(error||!email||!token);
  return <AuthShell eyebrow="One last step" title="Verify your email" description="Confirm your email to activate your customer account and continue shopping." footer={<Link className="font-bold text-sky-700 hover:text-sky-800" href="/sign-in">Already verified? Sign in</Link>}>
    {invalid?<div className="mt-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0"/><span>This verification link is invalid or has expired. You can create your account again to receive a fresh link.</span></div>:<div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-slate-700"><BadgeCheck className="mb-2 size-6 text-sky-700"/>This confirms that <strong>{email}</strong> belongs to you.</div>}
    <form action={verifyEmailAction} className="mt-5"><input type="hidden" name="email" value={email}/><input type="hidden" name="token" value={token}/><button className="min-h-12 w-full rounded-lg bg-[#0a6ed1] px-5 py-3 font-bold text-white enabled:hover:bg-[#085caf] disabled:cursor-not-allowed disabled:bg-slate-300" type="submit" disabled={invalid}>Verify and continue</button></form>
  </AuthShell>;
}
