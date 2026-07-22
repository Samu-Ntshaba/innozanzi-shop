import { requestPasswordResetAction } from "../actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-zinc-50 p-6"><section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Reset your password</h1>{status === "sent" && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">If the account exists, a reset link will be sent.</p>}<form action={requestPasswordResetAction} className="mt-6 space-y-4"><label className="block text-sm font-medium">Email<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="email" type="email" required /></label><button className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-white" type="submit">Request reset link</button></form></section></main>;
}
