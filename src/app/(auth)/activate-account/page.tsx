import { activateInvitedUser } from "@/domain/auth/invitations";
import { requireActivationUser } from "@/domain/auth/session";
import { AuthShell, authInputClass } from "@/components/auth/auth-shell";
import Link from "next/link";
import { inspectPartnerActivation } from "@/domain/auth/partner-activation";

const PasswordFields=()=> <>
  <label className="text-sm font-semibold text-slate-800">New password<input className={authInputClass} name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
  <label className="text-sm font-semibold text-slate-800">Confirm new password<input className={authInputClass} name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
  <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-800">Password requirements:</strong> at least 12 characters containing uppercase, lowercase and a number.</div>
</>;

export default async function ActivateAccountPage({ searchParams }: { searchParams: Promise<{ error?: string;token?:string;email?:string }> }) {
  const { error,token,email } = await searchParams;
  const errorMessage = error === "password-reused"
    ? "Choose a new password that is different from the temporary password."
    : error === "invalid" ? "This activation link is invalid, expired, or has already been used. Ask Innozanzi to resend the invitation."
    : "Check that both new-password fields match and use at least 12 characters with uppercase, lowercase and a number.";
  if(token&&email){
    const invitation=await inspectPartnerActivation(token,email);
    if(!invitation.valid)return <AuthShell eyebrow="Secure partner activation" title="Activation link unavailable" description={errorMessage} footer={<>Need assistance? <Link className="font-bold text-sky-700 hover:underline" href="/contact">Contact Innozanzi support</Link></>}><Link className="mt-6 inline-block rounded-lg bg-[#0a6ed1] px-5 py-3 font-bold text-white" href="/sign-in">Return to sign in</Link></AuthShell>;
    return <AuthShell eyebrow="Secure partner activation" title="Choose your permanent password" description={`Activate the sales partner workspace for ${invitation.email}.`} footer={<>Need assistance? <Link className="font-bold text-sky-700 hover:underline" href="/contact">Contact Innozanzi support</Link></>}>
      {error&&<p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
      <form action="/api/auth/activate-partner" method="post" className="mt-6 grid gap-5"><input type="hidden" name="token" value={token}/><input type="hidden" name="email" value={email}/><PasswordFields/><button className="min-h-12 rounded-lg bg-[#0a6ed1] px-5 font-bold text-white shadow-sm transition hover:bg-[#085caf]">Activate partner account</button></form>
    </AuthShell>;
  }
  const context = await requireActivationUser();
  return <AuthShell eyebrow="Secure account activation" title="Choose your permanent password" description={`Signed in as ${context.user.email}. Complete this final security step to open your workspace.`} footer={<>Need assistance? <Link className="font-bold text-sky-700 hover:underline" href="/contact">Contact Innozanzi support</Link></>}>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
    <form action={activateInvitedUser} className="mt-6 grid gap-5">
      <PasswordFields/>
      <button className="min-h-12 rounded-lg bg-[#0a6ed1] px-5 font-bold text-white shadow-sm transition hover:bg-[#085caf]">Activate account and continue</button>
    </form>
  </AuthShell>;
}
