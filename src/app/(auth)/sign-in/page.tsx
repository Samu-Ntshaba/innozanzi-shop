import Link from "next/link";
import {AlertCircle,CheckCircle2} from "lucide-react";
import {loginAction} from "../actions";
import {AuthShell,authInputClass} from "@/components/auth/auth-shell";
import {GoogleAuthButton} from "@/components/auth/google-auth-button";

const errors:Record<string,string>={
  "rate-limited":"Too many attempts. Please try again in 15 minutes.",
  "google-unavailable":"Google sign-in is not available yet.",
  "google-state":"The Google sign-in request expired. Please try again.",
  "google-existing-account":"This account must use its existing secure sign-in method.",
  "google-failed":"Google could not sign you in. Please try again.",
};

export default async function SignInPage({searchParams}:{searchParams:Promise<{error?:string;status?:string}>}){
  const{error,status}=await searchParams,message=error?(errors[error]??"The email or password is incorrect."):null;
  return <AuthShell eyebrow="Welcome back" title="Sign in" description="Continue shopping and track your orders." footer={<>New to Innozanzi? <Link className="font-bold text-sky-700 hover:text-sky-800" href="/register">Create an account</Link></>}>
    {message?<Notice tone="error">{message}</Notice>:null}
    {status==="password-reset"?<Notice tone="success">Your password was reset. You can sign in now.</Notice>:null}
    <GoogleAuthButton/>
    <form action={loginAction} className="space-y-4">
      <label className="block text-sm font-semibold text-slate-800">Email address<input className={authInputClass} name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required/></label>
      <label className="block text-sm font-semibold text-slate-800">Password<input className={authInputClass} name="password" type="password" autoComplete="current-password" placeholder="Your password" required/></label>
      <div className="flex justify-end"><Link className="text-sm font-semibold text-sky-700 hover:underline" href="/forgot-password">Forgot password?</Link></div>
      <button className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0a6ed1] px-5 py-3 font-bold text-white transition hover:bg-[#085caf] focus-visible:ring-4 focus-visible:ring-sky-200" type="submit">Sign in</button>
    </form>
  </AuthShell>;
}

function Notice({tone,children}:{tone:"error"|"success";children:React.ReactNode}){const Icon=tone==="error"?AlertCircle:CheckCircle2;return <div className={`mt-5 flex gap-3 rounded-lg border p-3 text-sm ${tone==="error"?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status"><Icon className="mt-0.5 size-4 shrink-0"/><span>{children}</span></div>}
