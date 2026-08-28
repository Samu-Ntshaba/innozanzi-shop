import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { requestPasswordResetAction } from "../actions";
import { AuthShell, authInputClass } from "@/components/auth/auth-shell";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <AuthShell eyebrow="Account recovery" title={status === "sent" ? "Check your email" : "Forgot your password?"} description={status === "sent" ? "If an account matches that address, your secure reset link is on its way." : "Enter your account email and we’ll send you a secure link to choose a new password."} footer={<Link className="font-bold text-sky-700 hover:text-sky-800" href="/sign-in">← Back to sign in</Link>}>
    {status === "sent" ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status"><CheckCircle2 className="size-6"/><p className="mt-3 font-bold">Reset link requested</p><p className="mt-1 text-sm leading-6">Check your inbox and spam folder. The link expires after one hour.</p></div> : <form action={requestPasswordResetAction} className="mt-6 space-y-4"><label className="block text-sm font-semibold text-slate-800">Email address<input className={authInputClass} name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required /></label><button className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0a6ed1] px-5 py-3 font-bold text-white hover:bg-[#085caf]" type="submit"><Mail className="size-4"/>Send reset link</button></form>}
  </AuthShell>;
}
