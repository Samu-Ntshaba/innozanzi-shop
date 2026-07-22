import { verifyEmailAction } from "../actions";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; token?: string; error?: string }> }) {
  const { email = "", token = "", error } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-zinc-50 p-6"><section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Verify your email</h1>{error && <p className="mt-4 text-sm text-red-700">This verification link is invalid or expired.</p>}<form action={verifyEmailAction} className="mt-6"><input type="hidden" name="email" value={email} /><input type="hidden" name="token" value={token} /><button className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white" type="submit" disabled={!email || !token}>Verify account</button></form></section></main>;
}
