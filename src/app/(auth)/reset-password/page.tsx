import Link from "next/link";
import { AlertCircle, LockKeyhole } from "lucide-react";
import { resetPasswordAction } from "../actions";
import { AuthShell, authInputClass } from "@/components/auth/auth-shell";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string; token?: string; error?: string }> }) {
  const { email = "", token = "", error } = await searchParams;
  const invalid=Boolean(error||!email||!token);
  return <AuthShell eyebrow="Secure account recovery" title="Choose a new password" description="Use at least 8 characters. Your other signed-in sessions will be closed for your security." footer={<Link className="font-bold text-sky-700 hover:text-sky-800" href="/sign-in">← Back to sign in</Link>}>
    {invalid?<div className="mt-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0"/><span>This reset link is invalid or has expired. <Link className="font-bold underline" href="/forgot-password">Request a new link</Link>.</span></div>:null}
    <form action={resetPasswordAction} className="mt-6 space-y-4"><input type="hidden" name="email" value={email}/><input type="hidden" name="token" value={token}/><label className="block text-sm font-semibold text-slate-800">New password<input className={authInputClass} name="password" type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required/></label><label className="block text-sm font-semibold text-slate-800">Confirm new password<input className={authInputClass} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} placeholder="Enter it again" required/></label><button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0a6ed1] px-5 py-3 font-bold text-white enabled:hover:bg-[#085caf] disabled:cursor-not-allowed disabled:bg-slate-300" type="submit" disabled={invalid}><LockKeyhole className="size-4"/>Update password</button></form>
  </AuthShell>;
}
