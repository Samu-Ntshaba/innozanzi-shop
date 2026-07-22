import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { requirePermission } from "@/domain/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePermission("reports.view");
  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-6 py-4"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link className="font-semibold" href="/admin">Innozanzi Shop Admin</Link><div className="flex items-center gap-4 text-sm"><span>{user.email}</span><form action={logoutAction}><button className="underline" type="submit">Sign out</button></form></div></div></header>
      <div className="mx-auto grid max-w-7xl gap-6 p-6 md:grid-cols-[220px_1fr]">
        <nav aria-label="Administration" className="rounded-xl bg-white p-4 shadow-sm"><ul className="space-y-3 text-sm"><li><Link href="/admin">Dashboard</Link></li><li><Link href="/admin/products">Products</Link></li><li><Link href="/admin/orders">Orders</Link></li><li><Link href="/admin/inventory">Inventory</Link></li></ul></nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
