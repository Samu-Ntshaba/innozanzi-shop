import Link from "next/link";
import { loginAction } from "../actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const { error, status } = await searchParams;
  const message = error === "rate-limited" ? "Too many attempts. Try again in 15 minutes." : error ? "The email or password is incorrect." : null;

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600">Access your Innozanzi Shop account.</p>
        {message && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        {status === "password-reset" && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Your password was reset. You can now sign in.</p>}
        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-zinc-800">Email<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="email" type="email" autoComplete="email" required /></label>
          <label className="block text-sm font-medium text-zinc-800">Password<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="password" type="password" autoComplete="current-password" required /></label>
          <button className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white" type="submit">Sign in</button>
        </form>
        <p className="mt-5 text-sm text-zinc-600">New customer? <Link className="font-medium text-zinc-950 underline" href="/register">Create an account</Link></p>
        <p className="mt-2 text-sm"><Link className="text-zinc-700 underline" href="/forgot-password">Forgot your password?</Link></p>
      </section>
    </main>
  );
}
