import { activateInvitedUser } from "@/domain/auth/invitations";
import { requireActivationUser } from "@/domain/auth/session";

const input = "mt-1 h-12 w-full rounded-lg border border-slate-300 px-3 text-base";

export default async function ActivateAccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const context = await requireActivationUser();
  const { error } = await searchParams;
  return <main className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8">
    <p className="text-sm font-bold uppercase tracking-wider text-sky-700">Mandatory activation</p>
    <h1 className="mt-2 text-3xl font-black text-slate-950">Choose your permanent password</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">Signed in as {context.user.email}. You cannot access protected pages until this step is complete.</p>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Activation could not be completed. Check the temporary password and new-password requirements.</p>}
    <form action={activateInvitedUser} className="mt-6 grid gap-4">
      <label className="text-sm font-medium">Temporary password<input className={input} name="temporaryPassword" type="password" autoComplete="current-password" required /></label>
      <label className="text-sm font-medium">New password<input className={input} name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
      <label className="text-sm font-medium">Confirm new password<input className={input} name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
      <p className="text-xs leading-5 text-slate-500">Use at least 12 characters with uppercase, lowercase and a number.</p>
      <button className="min-h-12 rounded-lg bg-[#071b33] px-5 font-bold text-white">Activate account</button>
    </form>
  </main>;
}
