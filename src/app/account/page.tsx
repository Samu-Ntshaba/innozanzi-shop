import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/domain/auth/session";

export default async function AccountPage() {
  const { user } = await requireUser();
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">Welcome, {user.name ?? user.email}</h1>
      <p className="mt-2 text-zinc-600">Your customer dashboard is ready for the commerce modules.</p>
      <form action={logoutAction} className="mt-8"><button className="rounded-lg border border-zinc-300 px-4 py-2" type="submit">Sign out</button></form>
    </main>
  );
}
