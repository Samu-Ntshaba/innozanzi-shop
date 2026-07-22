import Link from "next/link";
import { registerAction } from "../actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; status?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Create an account</h1>
        {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Check your details and password requirements.</p>}
        {params.status === "check-email" && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">If registration was successful, check your email to verify the account.</p>}
        <form action={registerAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Full name<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="name" autoComplete="name" required /></label>
          <label className="block text-sm font-medium">Email<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="email" type="email" autoComplete="email" required /></label>
          <label className="block text-sm font-medium">South African phone (optional)<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="phone" type="tel" autoComplete="tel" /></label>
          <label className="block text-sm font-medium">Password<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
          <label className="block text-sm font-medium">Confirm password<input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
          <button className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white" type="submit">Register</button>
        </form>
        <p className="mt-5 text-sm text-zinc-600">Already registered? <Link className="font-medium text-zinc-950 underline" href="/sign-in">Sign in</Link></p>
      </section>
    </main>
  );
}
