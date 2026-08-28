import Link from "next/link";
import {AlertCircle,CheckCircle2} from "lucide-react";
import {registerAction} from "../actions";
import {AuthShell,authInputClass} from "@/components/auth/auth-shell";
import {GoogleAuthButton} from "@/components/auth/google-auth-button";

export default async function RegisterPage({searchParams}:{searchParams:Promise<{error?:string;status?:string}>}){
  const params=await searchParams;
  return <AuthShell eyebrow="Join Innozanzi" title="Create your account" description="Save your orders, PC builds and delivery updates." footer={<>Already have an account? <Link className="font-bold text-sky-700 hover:text-sky-800" href="/sign-in">Sign in</Link></>}>
    {params.error?<Notice tone="error">Check your details and use a password with at least 8 characters.</Notice>:null}
    {params.status==="check-email"?<Notice tone="success">Check your email to finish creating your account.</Notice>:null}
    <GoogleAuthButton/>
    <form action={registerAction} className="space-y-4">
      <Field label="Full name" name="name" autoComplete="name" placeholder="Your name"/>
      <Field label="Email address" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"/>
      <Field label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8}/>
      <button className="min-h-12 w-full rounded-lg bg-[#0a6ed1] px-5 py-3 font-bold text-white transition hover:bg-[#085caf] focus-visible:ring-4 focus-visible:ring-sky-200" type="submit">Create account</button>
    </form>
  </AuthShell>;
}

type FieldProps={label:string;name:string;type?:string;inputMode?:"email";autoComplete:string;placeholder:string;minLength?:number};
function Field({label,name,type="text",inputMode,autoComplete,placeholder,minLength}:FieldProps){return <label className="block text-sm font-semibold text-slate-800">{label}<input className={authInputClass} name={name} type={type} inputMode={inputMode} autoComplete={autoComplete} placeholder={placeholder} minLength={minLength} required/></label>}
function Notice({tone,children}:{tone:"error"|"success";children:React.ReactNode}){const Icon=tone==="error"?AlertCircle:CheckCircle2;return <div className={`mt-5 flex gap-3 rounded-lg border p-3 text-sm ${tone==="error"?"border-red-200 bg-red-50 text-red-800":"border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status"><Icon className="mt-0.5 size-4 shrink-0"/><span>{children}</span></div>}
