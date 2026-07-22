import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";
import Link from "next/link";

export default async function AccountPage() {
  const { user } = await requireUser();
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">Welcome, {user.name ?? user.email}</h1>
      <p className="mt-2 text-zinc-600">Manage quotations, partnership access, payment verification and delivery progress.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><Link className="rounded-xl border bg-white p-5 font-semibold shadow-sm hover:border-sky-400" href="/account/quotations">Quotations and payment proof →</Link><Link className="rounded-xl border bg-white p-5 font-semibold shadow-sm hover:border-sky-400" href="/account/orders">Orders and delivery tracking →</Link><Link className="rounded-xl border bg-white p-5 font-semibold shadow-sm hover:border-sky-400" href="/account/partnership">Partnership programme →</Link><Link className="rounded-xl border bg-white p-5 font-semibold shadow-sm hover:border-sky-400" href="/shop">Request more products →</Link></div>
      <form action={logoutAction} className="mt-8"><button className="rounded-lg border border-zinc-300 px-4 py-2" type="submit">Sign out</button></form>
    </main>
  );
}
